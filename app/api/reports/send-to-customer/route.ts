import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { report_id, customer_email } = await req.json()
  if (!report_id || !customer_email) {
    return NextResponse.json({ error: "Missing report_id or customer_email" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // Fetch the report
  const { data: report, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", report_id)
    .single()

  if (error || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  // Generate viewing token with 30-day expiry
  const token = randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      viewing_token: token,
      viewing_token_expires_at: expiresAt.toISOString(),
      customer_email,
    })
    .eq("id", report_id)

  if (updateError) {
    return NextResponse.json({ error: "Failed to generate viewing link: " + updateError.message }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const viewUrl = `${appUrl}/estimate/${token}`
  const expiryDate = expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">
      <div style="text-align:center;border-bottom:2px solid #e5e5e5;padding-bottom:15px;margin-bottom:20px;">
        <h1 style="font-size:22px;margin:0;">Your Roof Estimate is Ready</h1>
        <p style="font-size:12px;color:#888;margin:5px 0 0;">From ${report.company_name || "Your Contractor"}</p>
      </div>

      <p style="font-size:14px;margin:0 0 15px;">Hi ${report.customer_name},</p>
      <p style="font-size:13px;color:#555;margin:0 0 20px;">
        ${report.company_name || "Your contractor"} has prepared a roofing estimate for your property. Review the details and let us know if you're interested.
      </p>

      <div style="background:#f9f9f9;border-radius:8px;padding:15px;margin-bottom:20px;">
        <p style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 8px;">Estimate Summary</p>
        <p style="font-size:13px;margin:3px 0;"><strong>Property:</strong> ${report.customer_address}</p>
        ${report.price_quote ? `<p style="font-size:13px;margin:3px 0;"><strong>Estimated Cost:</strong> $${Number(report.price_quote).toLocaleString()}</p>` : ""}
        ${report.scope_of_work ? `<p style="font-size:13px;margin:3px 0;"><strong>Scope:</strong> ${report.scope_of_work.substring(0, 100)}${report.scope_of_work.length > 100 ? "..." : ""}</p>` : ""}
      </div>

      <div style="text-align:center;margin:25px 0;">
        <a href="${viewUrl}" style="display:inline-block;background:#22c55e;color:white;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:bold;">
          View Full Estimate
        </a>
      </div>

      <p style="font-size:11px;color:#999;text-align:center;margin:0 0 20px;">
        This link expires on ${expiryDate}
      </p>

      <div style="border-top:1px solid #eee;padding-top:15px;margin-top:20px;">
        <p style="font-size:11px;color:#aaa;margin:0;">
          ${report.company_name || ""}
          ${report.company_phone ? ` | ${report.company_phone}` : ""}
          ${report.company_email ? ` | ${report.company_email}` : ""}
        </p>
        <p style="font-size:10px;color:#ccc;margin:5px 0 0;">Sent via XRoof</p>
      </div>
    </div>
  `

  // Insert "sent" event for tracking
  const { data: sentEvent } = await supabase
    .from("document_events")
    .insert({
      job_id: report.job_id || null,
      document_type: "report",
      document_id: report.id,
      event_type: "sent",
      recipient_email: customer_email,
    })
    .select("id")
    .single()

  // Add tracking pixel
  const trackingPixel = sentEvent
    ? `<img src="${appUrl}/api/track/open?eid=${sentEvent.id}" width="1" height="1" style="display:none;" />`
    : ""

  const { error: sendError } = await resend.emails.send({
    from: "XRoof Estimates <contracts@xroof.io>",
    to: customer_email,
    subject: `Roof Estimate from ${report.company_name || "Your Contractor"} — Review Your Quote`,
    html: html + trackingPixel,
  })

  if (sendError) {
    return NextResponse.json({ error: "Failed to send email: " + sendError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, view_url: viewUrl })
}
