import { Resend } from "resend"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getCustomTemplate, renderTemplate } from "@/lib/email-template"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"
import { generateProposalPdf } from "@/lib/pdf/generate-proposal"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { report_id, customer_email } = await req.json()
  if (!report_id || !customer_email) {
    return NextResponse.json({ error: "Missing report_id or customer_email" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

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

      ${report.job_id ? `<p style="font-size:12px;text-align:center;margin:0 0 20px;"><a href="${appUrl}/portal/${report.job_id}" style="color:#22c55e;text-decoration:underline;">View Your Project Portal</a></p>` : ""}

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

  // Get contractor_id from report directly, or from linked job
  const contractorId = report.contractor_id || (report.job_id
    ? (await supabase.from("jobs").select("contractor_id").eq("id", report.job_id).single()).data?.contractor_id
    : null)

  // Check for custom email template
  let emailSubject = `Roof Estimate from ${report.company_name || "Your Contractor"} — Review Your Quote`
  let emailHtml = html
  if (contractorId) {
    const custom = await getCustomTemplate(contractorId, "estimate_sent")
    if (custom) {
      const data: Record<string, string> = {
        customer_name: report.customer_name || "",
        company_name: report.company_name || "",
        job_address: report.customer_address || "",
        estimate_link: viewUrl,
        invoice_link: "",
        portal_link: `${appUrl}/portal/${report.job_id || ""}`,
        price: report.price_quote ? `$${Number(report.price_quote).toLocaleString()}` : "",
      }
      emailSubject = renderTemplate(custom.subject, data)
      emailHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">${renderTemplate(custom.body_html, data)}</div>`
    }
  }

  // Generate branded PDF proposal to attach
  console.log(`[SendReport] report_id=${report_id} logo_url=${report.logo_url || "(none)"} photos=${(report.photo_urls || []).length}`)
  let pdfAttachments: { filename: string; content: Buffer }[] = []
  try {
    let profile: Record<string, unknown> = {}
    if (contractorId) {
      const { data: p } = await supabase
        .from("profiles")
        .select("company_name, widget_color, logo_url, phone, email, business_address, license_number")
        .eq("id", contractorId)
        .single()
      if (p) profile = p
    }
    const pdfBuffer = await generateProposalPdf({ report, profile })
    const safeName = (report.customer_name || "estimate").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-")
    pdfAttachments = [{ filename: `Proposal-${safeName}.pdf`, content: pdfBuffer }]
  } catch (pdfErr) {
    console.error("PDF generation failed (email will send without attachment):", pdfErr)
  }

  const { error: sendError } = await resend.emails.send({
    from: `${report.company_name || "XRoof"} via XRoof <contracts@xroof.io>`,
    to: customer_email,
    subject: emailSubject,
    html: emailHtml + trackingPixel,
    attachments: pdfAttachments.length > 0 ? pdfAttachments : undefined,
  })

  if (sendError) {
    return NextResponse.json({ error: "Failed to send email: " + sendError.message }, { status: 500 })
  }

  // Auto-advance pipeline: Estimate Sent
  if (report.job_id) {
    await supabase.from("jobs").update({ status: "Estimate Sent", estimate_sent_at: new Date().toISOString() }).eq("id", report.job_id)

    // Fire automation trigger
    if (contractorId) {
      fetch(`${appUrl}/api/automations/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "estimate_sent", job_id: report.job_id, contractor_id: contractorId, internal_secret: process.env.CRON_SECRET }),
      }).catch((err: unknown) => console.error("[XRoof] fire-and-forget error:", err))
    }
  }

  return NextResponse.json({ success: true, view_url: viewUrl })
}
