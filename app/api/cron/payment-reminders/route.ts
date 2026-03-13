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

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const now = new Date()
  let sent = 0

  // Get unpaid invoices that are sent but not paid
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

    // Send reminders at 3, 7, and 14 days
    let shouldRemind = false
    if (daysSince >= 14 && reminderCount < 3) shouldRemind = true
    else if (daysSince >= 7 && reminderCount < 2) shouldRemind = true
    else if (daysSince >= 3 && reminderCount < 1) shouldRemind = true

    // Don't send more than once per day
    if (inv.last_reminder_at) {
      const lastReminder = new Date(inv.last_reminder_at)
      const hoursSinceReminder = (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60)
      if (hoursSinceReminder < 20) shouldRemind = false
    }

    if (!shouldRemind || !inv.customer_email) continue

    // Get contractor info for from name
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

    const urgency = daysSince >= 14 ? "Final reminder" : daysSince >= 7 ? "Friendly reminder" : "Reminder"
    const payUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://xroof.io"}/pay/${inv.id}`

    try {
      // Check for custom email template
      let emailSubject = `${urgency}: Invoice payment of $${inv.total?.toFixed(2)}`
      let emailHtml = `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2>${urgency}: Payment Due</h2>
            <p>Hi ${inv.customer_name || "there"},</p>
            <p>This is a ${urgency.toLowerCase()} that your invoice of <strong>$${inv.total?.toFixed(2)}</strong> from ${companyName} is still outstanding.</p>
            ${(inv.jobs as any)?.address ? `<p>Job: ${(inv.jobs as any).address}</p>` : ""}
            <p><a href="${payUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Pay Now</a></p>
            <p style="color: #888; font-size: 12px;">If you've already paid, please disregard this email.</p>
          </div>`
      if (contractorId) {
        const custom = await getCustomTemplate(contractorId, "invoice_sent")
        if (custom) {
          const data: Record<string, string> = {
            customer_name: inv.customer_name || "",
            company_name: companyName,
            invoice_link: payUrl,
            amount: `$${inv.total?.toFixed(2) || "0"}`,
            job_address: (inv.jobs as any)?.address || "",
          }
          emailSubject = renderTemplate(custom.subject, data)
          emailHtml = `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">${renderTemplate(custom.body_html, data)}</div>`
        }
      }

      // Record reminder event and add tracking pixel
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
}
