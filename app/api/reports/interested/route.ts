import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { token, selected_tier } = await req.json()
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // Find report by viewing token
  const { data: report, error } = await supabase
    .from("reports")
    .select("*")
    .eq("viewing_token", token)
    .single()

  if (error || !report) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 })
  }

  // Mark estimate as accepted
  await supabase
    .from("reports")
    .update({
      estimate_accepted: true,
      estimate_accepted_at: new Date().toISOString(),
      accepted_tier_index: selected_tier ?? null,
    })
    .eq("id", report.id)

  // Insert "interested" event (now means "accepted")
  await supabase.from("document_events").insert({
    job_id: report.job_id || null,
    document_type: "report",
    document_id: report.id,
    event_type: "interested",
    recipient_email: report.customer_email,
  })

  // Auto-advance job to "Contract Sent" if job exists
  if (report.job_id) {
    await supabase
      .from("jobs")
      .update({ status: "Contract Sent" })
      .eq("id", report.job_id)
      .in("status", ["New", "Estimate Sent"])
  }

  // Notify owner + admin via in-app + push + email
  if (report.contractor_id) {
    const { notifyRecipients } = await import("@/lib/notify")
    notifyRecipients(
      report.contractor_id,
      "owner_admin",
      "estimate_viewed",
      `Estimate Accepted — ${report.customer_name}`,
      `${report.customer_name} accepted your estimate for ${report.customer_address}`
    ).catch((err) => console.error("[XRoof] estimate accepted notification error:", err))
  }

  // Determine contractor email — use company_email from report, or look up via contractor_id
  let contractorEmail = report.company_email
  let contractorName = report.company_name || "Contractor"

  if (!contractorEmail && report.contractor_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, email")
      .eq("id", report.contractor_id)
      .single()
    if (profile) {
      contractorEmail = profile.email
      contractorName = profile.username || contractorName
    }
  }

  if (!contractorEmail) {
    // No contractor email found
    return NextResponse.json({ error: "No contractor email found" }, { status: 400 })
  }

  // Send notification email to contractor
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">
      <div style="text-align:center;background:#0891b2;color:white;padding:15px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;font-size:18px;">Estimate Accepted!</h2>
        <p style="margin:5px 0 0;font-size:12px;opacity:0.9;">${report.customer_name} accepted your estimate</p>
      </div>

      <div style="border:1px solid #e5e5e5;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;margin:0 0 15px;">Hi ${contractorName},</p>
        <p style="font-size:13px;color:#555;margin:0 0 20px;">
          Great news! <strong>${report.customer_name}</strong> has <strong>accepted your estimate</strong>${selected_tier != null && report.pricing_tiers?.[selected_tier] ? ` (${report.pricing_tiers[selected_tier]?.name} option)` : ""}. Send them a contract to make it official.
        </p>

        <div style="background:#f9f9f9;border-radius:8px;padding:15px;margin-bottom:15px;">
          <p style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 8px;">Job Details</p>
          <p style="font-size:13px;margin:3px 0;"><strong>Customer:</strong> ${report.customer_name}</p>
          <p style="font-size:13px;margin:3px 0;"><strong>Address:</strong> ${report.customer_address}</p>
          ${report.customer_phone ? `<p style="font-size:13px;margin:3px 0;"><strong>Phone:</strong> ${report.customer_phone}</p>` : ""}
          ${report.customer_email ? `<p style="font-size:13px;margin:3px 0;"><strong>Email:</strong> ${report.customer_email}</p>` : ""}
          ${report.price_quote ? `<p style="font-size:13px;margin:3px 0;"><strong>Estimate:</strong> $${Number(report.price_quote).toLocaleString()}</p>` : ""}
        </div>

        <p style="font-size:12px;color:#555;">
          Reach out to the customer as soon as possible to discuss next steps and schedule the work.
        </p>
      </div>

      <p style="font-size:10px;color:#ccc;text-align:center;margin-top:15px;">Sent via XRoof</p>
    </div>
  `

  const recipients = [contractorEmail]
  // Notify admin if configured
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && contractorEmail !== adminEmail) {
    recipients.push(adminEmail)
  }

  await resend.emails.send({
    from: `${report.company_name || "XRoof"} via XRoof <contracts@xroof.io>`,
    to: recipients,
    subject: `${report.customer_name} Accepted Your Estimate — ${report.customer_address}`,
    html,
  })

  return NextResponse.json({ success: true })
}
