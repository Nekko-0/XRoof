import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getCustomTemplate, renderTemplate } from "@/lib/email-template"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { job_id, customer_email, customer_name, company_name, google_review_url } = await req.json()

  if (!job_id || !customer_email || !google_review_url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">
      <div style="text-align:center;border-bottom:2px solid #e5e5e5;padding-bottom:15px;margin-bottom:20px;">
        <h1 style="font-size:22px;margin:0;">Thank You for Choosing Us!</h1>
        <p style="font-size:12px;color:#888;margin:5px 0 0;">${company_name || "Your Roofing Contractor"}</p>
      </div>

      <p style="font-size:14px;margin:0 0 15px;">Hi ${customer_name || "there"},</p>
      <p style="font-size:13px;color:#555;margin:0 0 20px;">
        We hope you're happy with your new roof! Your feedback means the world to us and helps other homeowners find quality roofing services.
      </p>
      <p style="font-size:13px;color:#555;margin:0 0 25px;">
        Would you take a moment to share your experience?
      </p>

      <div style="text-align:center;margin:25px 0;">
        <a href="${google_review_url}" style="display:inline-block;background:#4285f4;color:white;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:bold;">
          Leave a Google Review
        </a>
      </div>

      <p style="font-size:11px;color:#999;text-align:center;margin:20px 0;">
        It only takes a minute and we truly appreciate it!
      </p>

      <div style="border-top:1px solid #eee;padding-top:15px;margin-top:20px;">
        <p style="font-size:11px;color:#aaa;margin:0;">${company_name || ""}</p>
        <p style="font-size:10px;color:#ccc;margin:5px 0 0;">Sent via XRoof</p>
      </div>
    </div>
  `

  // Track the review request
  await supabase.from("document_events").insert({
    job_id,
    document_type: "review",
    document_id: job_id,
    event_type: "review_requested",
    recipient_email: customer_email,
  })

  // Check for custom email template
  let emailSubject = `How was your experience with ${company_name || "us"}? We'd love your feedback!`
  let emailHtml = html
  const { data: job } = await supabase.from("jobs").select("contractor_id").eq("id", job_id).single()
  if (job?.contractor_id) {
    const custom = await getCustomTemplate(job.contractor_id, "review_request")
    if (custom) {
      const data: Record<string, string> = {
        customer_name: customer_name || "",
        company_name: company_name || "",
        review_link: google_review_url,
      }
      emailSubject = renderTemplate(custom.subject, data)
      emailHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">${renderTemplate(custom.body_html, data)}</div>`
    }
  }

  const { error: sendError } = await resend.emails.send({
    from: `${company_name || "XRoof"} via XRoof <contracts@xroof.io>`,
    to: customer_email,
    subject: emailSubject,
    html: emailHtml,
  })

  if (sendError) {
    return NextResponse.json({ error: "Failed to send email: " + sendError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
