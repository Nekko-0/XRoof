import { getStripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getQBClient, syncCustomerToQB, syncInvoiceToQB, syncPaymentToQB } from "@/lib/quickbooks"
import { emitToUser } from "@/lib/event-emitter"

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
          await supabase
            .from("invoices")
            .update({
              status: "paid",
              stripe_payment_intent_id: session.payment_intent,
              paid_at: new Date().toISOString(),
            })
            .eq("id", invoiceId)

          // Auto-advance pipeline: Completed (only when ALL invoices for this job are paid)
          const { data: inv } = await supabase.from("invoices").select("job_id, contractor_id, amount, customer_name").eq("id", invoiceId).single()
          if (inv?.job_id) {
            const { data: allInvoices } = await supabase.from("invoices").select("status").eq("job_id", inv.job_id)
            if (allInvoices?.every((i: any) => i.status === "paid")) {
              await supabase.from("jobs").update({ status: "Completed", completed_at: new Date().toISOString() }).eq("id", inv.job_id)
            }

            // Emit real-time SSE event
            if (inv.contractor_id) {
              emitToUser(inv.contractor_id, {
                type: "payment_received",
                payload: { amount: inv.amount, customerName: inv.customer_name },
              })
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
