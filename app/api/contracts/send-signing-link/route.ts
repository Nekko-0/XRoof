import { Resend } from "resend"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"
import { getContractorBranding } from "@/lib/branding"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { contract_id, customer_email } = await req.json()
  if (!contract_id || !customer_email) {
    return NextResponse.json({ error: "Missing contract_id or customer_email" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Fetch the contract
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contract_id)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 })
  }

  if (contract.contractor_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const branding = contract.contractor_id
    ? await getContractorBranding(contract.contractor_id)
    : { company_name: contract.contractor_company || "XRoof", primary_color: "#22c55e" }

  // Generate signing token with 30-day expiry
  const token = randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const { error: updateError } = await supabase
    .from("contracts")
    .update({
      signing_token: token,
      signing_token_expires_at: expiresAt.toISOString(),
      customer_email,
      status: "pending_customer",
    })
    .eq("id", contract_id)

  if (updateError) {
    return NextResponse.json({ error: "Failed to generate signing link: " + updateError.message }, { status: 500 })
  }

  // Build the signing URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const signingUrl = `${appUrl}/sign/${token}`
  const expiryDate = expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">
      <div style="text-align:center;border-bottom:2px solid #e5e5e5;padding-bottom:15px;margin-bottom:20px;">
        <h1 style="font-size:22px;margin:0;">Contract Ready for Your Signature</h1>
        <p style="font-size:12px;color:#888;margin:5px 0 0;">From ${contract.contractor_company || contract.contractor_name}</p>
      </div>

      <p style="font-size:14px;margin:0 0 15px;">Hi ${contract.customer_name},</p>
      <p style="font-size:13px;color:#555;margin:0 0 20px;">
        ${contract.contractor_name}${contract.contractor_company ? ` from ${contract.contractor_company}` : ""} has prepared a roofing contract for your review and signature.
      </p>

      <div style="background:#f9f9f9;border-radius:8px;padding:15px;margin-bottom:20px;">
        <p style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 8px;">Contract Summary</p>
        <p style="font-size:13px;margin:3px 0;"><strong>Project:</strong> ${contract.project_address}</p>
        <p style="font-size:13px;margin:3px 0;"><strong>Price:</strong> $${Number(contract.contract_price).toLocaleString()}</p>
        <p style="font-size:13px;margin:3px 0;"><strong>Contractor:</strong> ${contract.contractor_name}</p>
      </div>

      <div style="text-align:center;margin:25px 0;">
        <a href="${signingUrl}" style="display:inline-block;background:${branding.primary_color};color:white;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:bold;">
          Review & Sign Contract
        </a>
      </div>

      <p style="font-size:11px;color:#999;text-align:center;margin:0 0 20px;">
        This link expires on ${expiryDate}
      </p>

      ${contract.job_id ? `<p style="font-size:12px;text-align:center;margin:0 0 20px;"><a href="${appUrl}/portal/${contract.job_id}" style="color:${branding.primary_color};text-decoration:underline;">View Your Project Portal</a></p>` : ""}

      <div style="border-top:1px solid #eee;padding-top:15px;margin-top:20px;">
        <p style="font-size:11px;color:#aaa;margin:0;">
          ${contract.contractor_name}${contract.contractor_company ? ` | ${contract.contractor_company}` : ""}
          ${contract.contractor_phone ? ` | ${contract.contractor_phone}` : ""}
          ${contract.contractor_email ? ` | ${contract.contractor_email}` : ""}
        </p>
        <p style="font-size:10px;color:#ccc;margin:5px 0 0;">Sent via XRoof</p>
      </div>
    </div>
  `

  // Insert "sent" event for tracking
  const { data: sentEvent } = await supabase
    .from("document_events")
    .insert({
      job_id: contract.job_id,
      document_type: "contract",
      document_id: contract.id,
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
    from: `${branding.company_name} via XRoof <contracts@xroof.io>`,
    to: customer_email,
    subject: `Contract from ${contract.contractor_company || contract.contractor_name} — Please Review & Sign`,
    html: html + trackingPixel,
  })

  if (sendError) {
    return NextResponse.json({ error: "Failed to send email: " + sendError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, signing_url: signingUrl })
}
