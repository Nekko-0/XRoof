import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { getCustomTemplate, renderTemplate } from "@/lib/email-template"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

// Smart 4-step escalating payment reminders
const DEFAULT_STEPS = [
  { step: 1, day: 1, subject: "Friendly reminder: Invoice from {company_name}", urgencyColor: "#3b82f6", urgencyLabel: "Payment Reminder",
    body: "Just a friendly reminder that your invoice of <strong>{amount}</strong> is due. Click below to make a payment at your convenience." },
  { step: 2, day: 7, subject: "Your invoice from {company_name} is overdue", urgencyColor: "#f59e0b", urgencyLabel: "Overdue Notice",
    body: "Your invoice of <strong>{amount}</strong> is now overdue. Please update your payment as soon as possible to avoid any late fees." },
  { step: 3, day: 14, subject: "Final notice: Invoice from {company_name}", urgencyColor: "#ef6c00", urgencyLabel: "Final Notice",
    body: "This is a final notice regarding your outstanding invoice of <strong>{amount}</strong>. Late fees may apply if payment is not received within 48 hours." },
  { step: 4, day: 30, subject: "Urgent: Past due invoice from {company_name}", urgencyColor: "#d32f2f", urgencyLabel: "Past Due",
    body: "Your invoice of <strong>{amount}</strong> is significantly past due and requires immediate attention. Please make payment today to avoid further action." },
]

function buildReminderEmail(data: { name: string; body: string; payUrl: string; companyName: string; urgencyColor: string; urgencyLabel: string; address: string; amount: string }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<div style="background:${data.urgencyColor};padding:24px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:20px;">${data.urgencyLabel}</h1></div>
<div style="padding:32px;">
<p style="color:#333;font-size:16px;margin:0 0 16px;">Hi ${data.name},</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">${data.body}</p>
${data.address ? `<p style="color:#888;font-size:13px;margin:0 0 16px;">Job: ${data.address}</p>` : ""}
<div style="text-align:center;margin:24px 0;">
<a href="${data.payUrl}" style="display:inline-block;background:${data.urgencyColor};color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;">Pay Now — ${data.amount}</a></div>
<p style="color:#888;font-size:13px;margin:24px 0 0;">If you've already paid, please disregard this email. Need help? Reply to this email.</p>
</div></div></div></body></html>`
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const now = new Date()
  let sent = 0

  try {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, job_id, customer_email, customer_name, total, created_at, reminder_count, last_reminder_at, jobs(contractor_id, address)")
      .eq("status", "sent")
      .order("created_at", { ascending: true })

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ message: "No invoices to remind", sent: 0 })
    }

    for (const inv of invoices) {
      const createdAt = new Date(inv.created_at)
      const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      const reminderCount = inv.reminder_count || 0

      // Determine which step to send (4-step escalation)
      let targetStep: typeof DEFAULT_STEPS[number] | null = null
      if (daysSince >= 30 && reminderCount < 4) targetStep = DEFAULT_STEPS[3]
      else if (daysSince >= 14 && reminderCount < 3) targetStep = DEFAULT_STEPS[2]
      else if (daysSince >= 7 && reminderCount < 2) targetStep = DEFAULT_STEPS[1]
      else if (daysSince >= 1 && reminderCount < 1) targetStep = DEFAULT_STEPS[0]

      if (!targetStep) continue

      // Don't send more than once per 20 hours
      if (inv.last_reminder_at) {
        const hoursSince = (now.getTime() - new Date(inv.last_reminder_at).getTime()) / (1000 * 60 * 60)
        if (hoursSince < 20) continue
      }

      if (!inv.customer_email) continue

      const contractorId = (inv.jobs as any)?.contractor_id
      let companyName = "Your Contractor"
      if (contractorId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_name")
          .eq("id", contractorId)
          .single()
        if (profile?.company_name) companyName = profile.company_name
      }

      const payUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://xroof.io"}/pay/${inv.id}`
      const amount = `$${inv.total?.toFixed(2) || "0"}`
      const vars: Record<string, string> = {
        customer_name: inv.customer_name || "there",
        company_name: companyName,
        invoice_link: payUrl,
        amount,
        job_address: (inv.jobs as any)?.address || "",
      }

      try {
        let emailSubject = targetStep.subject.replace(/\{(\w+)\}/g, (_, k) => vars[k] || "")
        let emailHtml = ""

        // Check for contractor custom template for this step
        if (contractorId) {
          const { data: customTemplate } = await supabase
            .from("reminder_templates")
            .select("*")
            .eq("contractor_id", contractorId)
            .eq("step", targetStep.step)
            .single()

          if (customTemplate) {
            emailSubject = renderTemplate(customTemplate.subject, vars)
            emailHtml = buildReminderEmail({
              name: inv.customer_name || "there",
              body: renderTemplate(customTemplate.body_html, vars),
              payUrl,
              companyName,
              urgencyColor: targetStep.urgencyColor,
              urgencyLabel: targetStep.urgencyLabel,
              address: (inv.jobs as any)?.address || "",
              amount,
            })
          }
        }

        // Fall back to legacy custom template
        if (!emailHtml && contractorId) {
          const custom = await getCustomTemplate(contractorId, "invoice_sent")
          if (custom) {
            emailSubject = renderTemplate(custom.subject, vars)
            emailHtml = `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">${renderTemplate(custom.body_html, vars)}</div>`
          }
        }

        // Fall back to default template
        if (!emailHtml) {
          emailHtml = buildReminderEmail({
            name: inv.customer_name || "there",
            body: targetStep.body.replace(/\{(\w+)\}/g, (_, k) => vars[k] || ""),
            payUrl,
            companyName,
            urgencyColor: targetStep.urgencyColor,
            urgencyLabel: targetStep.urgencyLabel,
            address: (inv.jobs as any)?.address || "",
            amount,
          })
        }

        // Record event + tracking pixel
        const { data: sentEvent } = await supabase
          .from("document_events")
          .insert({
            job_id: inv.job_id || null,
            document_type: "invoice",
            document_id: inv.id,
            event_type: "reminder_sent",
            recipient_email: inv.customer_email,
          })
          .select("id")
          .single()

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://xroof.io"
        const trackingPixel = sentEvent
          ? `<img src="${appUrl}/api/track/open?eid=${sentEvent.id}" width="1" height="1" style="display:none;" />`
          : ""

        await resend.emails.send({
          from: `${companyName} via XRoof <noreply@xroof.io>`,
          to: inv.customer_email,
          subject: emailSubject,
          html: emailHtml + trackingPixel,
        })

        await supabase
          .from("invoices")
          .update({
            reminder_count: reminderCount + 1,
            last_reminder_at: now.toISOString(),
          })
          .eq("id", inv.id)

        sent++
      } catch (err) {
        console.error("Payment reminder failed:", inv.id, err)
      }
    }

    return NextResponse.json({ message: "Payment reminders processed", sent })
  } catch (err) {
    console.error("Payment reminders cron error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
