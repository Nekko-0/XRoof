import { getStripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getQBClient, syncCustomerToQB, syncInvoiceToQB, syncPaymentToQB } from "@/lib/quickbooks"
import { emitToUser } from "@/lib/event-emitter"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const stripe = getStripe()
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any
      const userId = session.metadata?.supabase_user_id

      if (session.mode === "subscription" && userId) {
        const subscriptionId = session.subscription as string
        const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data"] }) as any

        // In newer Stripe API versions, period dates are on the item, not the subscription
        const item = sub.items?.data?.[0]
        const periodStart = sub.current_period_start || item?.current_period_start || 0
        const periodEnd = sub.current_period_end || item?.current_period_end || 0

        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscriptionId,
          plan: session.metadata?.plan || "monthly",
          status: sub.status,
          current_period_start: new Date(periodStart * 1000).toISOString(),
          current_period_end: new Date(periodEnd * 1000).toISOString(),
        }, { onConflict: "user_id" })

        // Handle referral credit ($50 for both referrer and referred)
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("referred_by")
            .eq("id", userId)
            .single()

          if (profile?.referred_by) {
            // Look up the referrer by their code
            const { data: referralCode } = await supabase
              .from("referral_codes")
              .select("user_id")
              .eq("code", profile.referred_by)
              .single()

            if (referralCode) {
              // Record the conversion
              await supabase.from("referral_conversions").insert({
                referrer_id: referralCode.user_id,
                referred_id: userId,
                converted: true,
                reward_type: "credit",
                reward_amount: 5000, // $50 in cents
              })

              // Apply $50 credit to referrer's Stripe customer
              const { data: referrerSub } = await supabase
                .from("subscriptions")
                .select("stripe_customer_id")
                .eq("user_id", referralCode.user_id)
                .single()

              if (referrerSub?.stripe_customer_id) {
                await stripe.customers.createBalanceTransaction(referrerSub.stripe_customer_id, {
                  amount: -5000, // negative = credit
                  currency: "usd",
                  description: "Referral bonus — $50 credit for referring a new contractor",
                })
              }

              // Apply $50 credit to the new subscriber too
              if (session.customer) {
                await stripe.customers.createBalanceTransaction(session.customer as string, {
                  amount: -5000,
                  currency: "usd",
                  description: "Welcome bonus — $50 credit for signing up via referral",
                })
              }

              // Clear the referred_by so it doesn't fire again
              await supabase.from("profiles").update({ referred_by: null }).eq("id", userId)
            }
          }
        } catch (refErr) {
          console.error("[XRoof] referral credit error:", refErr)
        }
      }

      if (session.metadata?.type === "report_purchase" && userId) {
        await supabase.from("report_purchases").insert({
          user_id: userId,
          report_id: session.metadata.report_id,
          stripe_payment_intent_id: session.payment_intent,
          amount: session.amount_total,
          status: "paid",
        })
      }

      // Handle invoice payments via Stripe Connect
      if (session.metadata?.type === "invoice_payment") {
        const invoiceId = session.metadata.invoice_id
        if (invoiceId) {
          const milestoneIdx = session.metadata.milestone_index !== undefined
            ? parseInt(session.metadata.milestone_index) : undefined

          // Fetch current invoice to check milestones
          const { data: currentInvoice } = await supabase
            .from("invoices")
            .select("milestones")
            .eq("id", invoiceId)
            .single()

          const milestones = currentInvoice?.milestones || []

          if (milestoneIdx !== undefined && milestones[milestoneIdx]) {
            // Milestone payment — mark only this milestone as paid
            milestones[milestoneIdx].paid = true
            milestones[milestoneIdx].due = false

            // Set next unpaid milestone as due
            const nextUnpaid = milestones.findIndex((m: any, i: number) => i > milestoneIdx && !m.paid)
            if (nextUnpaid !== -1) milestones[nextUnpaid].due = true

            const allPaid = milestones.every((m: any) => m.paid)

            await supabase.from("invoices").update({
              milestones,
              ...(allPaid ? { status: "paid", paid_at: new Date().toISOString() } : {}),
              stripe_payment_intent_id: session.payment_intent,
            }).eq("id", invoiceId)
          } else {
            // No milestones — full payment, mark as paid
            await supabase
              .from("invoices")
              .update({
                status: "paid",
                stripe_payment_intent_id: session.payment_intent,
                paid_at: new Date().toISOString(),
              })
              .eq("id", invoiceId)
          }

          // Record "paid" event for activity feed
          const { data: inv } = await supabase.from("invoices").select("job_id, contractor_id, amount, customer_name, customer_email").eq("id", invoiceId).single()
          if (inv) {
            try {
              await supabase.from("document_events").insert({
                job_id: inv.job_id || null,
                document_type: "invoice",
                document_id: invoiceId,
                event_type: "paid",
                recipient_email: inv.customer_email || inv.customer_name || "",
              })
            } catch {}
          }

          // Auto-advance pipeline: Completed (only when ALL invoices for this job are paid)
          if (inv?.job_id) {
            const { data: allInvoices } = await supabase.from("invoices").select("status").eq("job_id", inv.job_id)
            if (allInvoices?.every((i: any) => i.status === "paid")) {
              await supabase.from("jobs").update({ status: "Completed", completed_at: new Date().toISOString() }).eq("id", inv.job_id)
            }

            // Emit real-time SSE event + notify owner/admin
            if (inv.contractor_id) {
              emitToUser(inv.contractor_id, {
                type: "payment_received",
                payload: { amount: inv.amount, customerName: inv.customer_name },
              })

              // Notify owner + admin via in-app + push + email
              const { notifyRecipients } = await import("@/lib/notify")
              const amountStr = `$${(Number(inv.amount) / 100).toLocaleString()}`
              notifyRecipients(
                inv.contractor_id,
                "owner_admin",
                "payment_received",
                `Payment Received — ${inv.customer_name}`,
                `${amountStr} payment received from ${inv.customer_name}`
              ).catch((err: unknown) => console.error("[XRoof] payment notification error:", err))

              // Send receipt email to homeowner
              if (inv.customer_email) {
                const { getContractorBranding } = await import("@/lib/branding")
                const branding = await getContractorBranding(inv.contractor_id)
                const paidAmount = session.amount_total
                  ? `$${(session.amount_total / 100).toLocaleString()}`
                  : amountStr
                const paidDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                const milestoneLabel = milestoneIdx !== undefined && milestones[milestoneIdx]
                  ? ` — ${milestones[milestoneIdx].label || `Milestone ${milestoneIdx + 1}`}`
                  : ""
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
                const portalLink = inv.job_id ? `${appUrl}/portal/${inv.job_id}` : ""

                const receiptHtml = `
                  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">
                    <div style="text-align:center;border-bottom:2px solid #e5e5e5;padding-bottom:15px;margin-bottom:20px;">
                      <h1 style="font-size:22px;margin:0;color:${branding.primary_color};">Payment Receipt</h1>
                      <p style="font-size:12px;color:#888;margin:5px 0 0;">From ${branding.company_name}</p>
                    </div>
                    <p style="font-size:14px;margin:0 0 15px;">Hi ${inv.customer_name},</p>
                    <p style="font-size:13px;color:#555;margin:0 0 20px;">
                      Thank you for your payment. Here are the details:
                    </p>
                    <div style="background:#f9f9f9;border-radius:8px;padding:15px;margin-bottom:20px;">
                      <p style="font-size:13px;margin:3px 0;"><strong>Amount Paid:</strong> ${paidAmount}</p>
                      <p style="font-size:13px;margin:3px 0;"><strong>Date:</strong> ${paidDate}</p>
                      ${milestoneLabel ? `<p style="font-size:13px;margin:3px 0;"><strong>Milestone:</strong> ${milestoneLabel.replace(" — ", "")}</p>` : ""}
                      <p style="font-size:13px;margin:3px 0;"><strong>Contractor:</strong> ${branding.company_name}</p>
                    </div>
                    ${portalLink ? `
                      <div style="text-align:center;margin:25px 0;">
                        <a href="${portalLink}" style="display:inline-block;background:${branding.primary_color};color:white;text-decoration:none;padding:12px 30px;border-radius:8px;font-size:14px;font-weight:bold;">
                          View Project Portal
                        </a>
                      </div>
                    ` : ""}
                    <div style="border-top:1px solid #eee;padding-top:15px;margin-top:20px;">
                      <p style="font-size:11px;color:#aaa;margin:0;">
                        ${branding.company_name} | Sent via XRoof
                      </p>
                    </div>
                  </div>
                `

                resend.emails.send({
                  from: `${branding.company_name} via XRoof <receipts@xroof.io>`,
                  to: inv.customer_email,
                  subject: `Payment Receipt — ${paidAmount}${milestoneLabel} | ${branding.company_name}`,
                  html: receiptHtml,
                }).catch((err: unknown) => console.error("[XRoof] receipt email error:", err))
              }
            }

            // Fire payment_received automation trigger
            if (inv.contractor_id) {
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
              fetch(`${appUrl}/api/automations/trigger`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  trigger: "payment_received",
                  job_id: inv.job_id,
                  contractor_id: inv.contractor_id,
                  internal_secret: process.env.CRON_SECRET,
                }),
              }).catch((err: unknown) => console.error("[XRoof] fire-and-forget error:", err))

              // Auto-sync paid invoice to QuickBooks if connected
              try {
                const qbClient = await getQBClient(inv.contractor_id, supabase as any)
                if (qbClient) {
                  const { data: paidInv } = await supabase
                    .from("invoices")
                    .select("*, jobs(customer_name, customer_email, customer_phone, address)")
                    .eq("id", invoiceId)
                    .single()

                  if (paidInv && !paidInv.quickbooks_invoice_id) {
                    const job = paidInv.jobs as any
                    const customerName = paidInv.customer_name || job?.customer_name || "Unknown"
                    const qbCustomer = await syncCustomerToQB(qbClient, {
                      name: customerName,
                      email: job?.customer_email,
                      phone: job?.customer_phone,
                      address: job?.address,
                    })
                    const qbInvoice = await syncInvoiceToQB(qbClient, {
                      invoice_number: paidInv.invoice_number || `INV-${paidInv.id.slice(0, 8)}`,
                      amount: paidInv.amount,
                      line_items: paidInv.line_items,
                      customer_name: customerName,
                    }, { Id: qbCustomer.Id, DisplayName: qbCustomer.DisplayName })

                    await syncPaymentToQB(qbClient, paidInv.amount, { Id: qbCustomer.Id }, { Id: qbInvoice.Id })
                    await supabase.from("invoices").update({ quickbooks_invoice_id: qbInvoice.Id }).eq("id", invoiceId)
                    await supabase.from("profiles").update({ quickbooks_last_sync: new Date().toISOString() }).eq("id", inv.contractor_id)
                  }
                }
              } catch (qbErr) {
                console.error("QuickBooks auto-sync failed:", qbErr)
              }
            }
          }
        }
      }
      break
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as any
      const item = sub.items?.data?.[0]
      const periodStart = sub.current_period_start || item?.current_period_start || 0
      const periodEnd = sub.current_period_end || item?.current_period_end || 0
      await supabase
        .from("subscriptions")
        .update({
          status: sub.status,
          current_period_start: new Date(periodStart * 1000).toISOString(),
          current_period_end: new Date(periodEnd * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", sub.id)
      break
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as any
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", sub.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
