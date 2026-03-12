import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { token, signature_data_url } = await req.json()
  if (!token || !signature_data_url) {
    return NextResponse.json({ error: "Missing token or signature" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // Find contract by token
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("signing_token", token)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: "Invalid signing link" }, { status: 404 })
  }

  // Check expiry
  if (contract.signing_token_expires_at && new Date(contract.signing_token_expires_at) < new Date()) {
    return NextResponse.json({ error: "This signing link has expired. Please ask the contractor to send a new one." }, { status: 410 })
  }

  // Check if already signed
  if (contract.status === "signed") {
    return NextResponse.json({ error: "This contract has already been signed." }, { status: 409 })
  }

  // Upload customer signature
  const base64Data = signature_data_url.replace(/^data:image\/png;base64,/, "")
  const buffer = Buffer.from(base64Data, "base64")
  const fileName = `${contract.job_id}-customer-${Date.now()}.png`

  const { error: uploadError } = await supabase.storage
    .from("contract-signatures")
    .upload(fileName, buffer, { contentType: "image/png" })

  if (uploadError) {
    return NextResponse.json({ error: "Failed to upload signature: " + uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from("contract-signatures").getPublicUrl(fileName)
  const customerSigUrl = urlData.publicUrl

  const now = new Date().toISOString()

  // Update contract — mark as signed, clear token
  const { error: updateError } = await supabase
    .from("contracts")
    .update({
      customer_signature_url: customerSigUrl,
      customer_signed_at: now,
      status: "signed",
      signing_token: null,
      signing_token_expires_at: null,
    })
    .eq("id", contract.id)

  if (updateError) {
    return NextResponse.json({ error: "Failed to update contract: " + updateError.message }, { status: 500 })
  }

  // Update job record + auto-advance pipeline: Scheduled
  await supabase
    .from("jobs")
    .update({
      signature_url: customerSigUrl,
      signed_at: now,
      status: "Scheduled",
    })
    .eq("id", contract.job_id)

  // Track signing event
  await supabase.from("document_events").insert({
    job_id: contract.job_id,
    document_type: "contract",
    document_id: contract.id,
    event_type: "signed",
    recipient_email: contract.customer_email,
  })

  // Fire contract_signed automation trigger
  if (contract.job_id && contract.contractor_id) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    fetch(`${appUrl}/api/automations/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trigger: "contract_signed",
        job_id: contract.job_id,
        contractor_id: contract.contractor_id,
      }),
    }).catch(() => {})
  }

  // Send completion email to contractor + admin
  const terms = contract.terms || {}
  const scopeItems = (terms.scope_items || [])
    .filter((i: any) => i.checked)
    .map((i: any) => `<li style="margin-bottom:4px;">${i.label}</li>`)
    .join("")

  const depositAmt = ((contract.contract_price * contract.deposit_percent) / 100).toLocaleString()
  const finalAmt = ((contract.contract_price * (100 - contract.deposit_percent)) / 100).toLocaleString()

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#111;">
      <div style="text-align:center;background:#22c55e;color:white;padding:15px;border-radius:8px 8px 0 0;margin-bottom:0;">
        <h2 style="margin:0;font-size:18px;">Contract Signed!</h2>
        <p style="margin:5px 0 0;font-size:12px;opacity:0.9;">${contract.customer_name} signed on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div style="border:1px solid #e5e5e5;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
        <table style="width:100%;margin-bottom:20px;">
          <tr>
            <td style="vertical-align:top;width:50%;padding-right:10px;">
              <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 5px;">Contractor</p>
              <p style="margin:2px 0;font-size:13px;">${contract.contractor_name}</p>
              ${contract.contractor_company ? `<p style="margin:2px 0;font-size:13px;">${contract.contractor_company}</p>` : ""}
            </td>
            <td style="vertical-align:top;width:50%;padding-left:10px;">
              <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 5px;">Customer</p>
              <p style="margin:2px 0;font-size:13px;">${contract.customer_name}</p>
              <p style="margin:2px 0;font-size:13px;">${contract.project_address}</p>
            </td>
          </tr>
        </table>

        <h3 style="font-size:14px;margin:20px 0 8px;">Scope of Work</h3>
        <ul style="font-size:12px;color:#333;padding-left:20px;margin:0 0 5px;">${scopeItems}</ul>

        <h3 style="font-size:14px;margin:20px 0 8px;">Contract Price</h3>
        <p style="font-size:18px;font-weight:bold;margin:0;">$${Number(contract.contract_price).toLocaleString()}</p>

        <h3 style="font-size:14px;margin:20px 0 8px;">Payment Terms</h3>
        <p style="font-size:12px;margin:0;">
          <strong>Deposit:</strong> ${contract.deposit_percent}% ($${depositAmt}) due upon signing<br/>
          <strong>Final:</strong> ${100 - contract.deposit_percent}% ($${finalAmt}) due upon completion
        </p>

        <table style="width:100%;margin-top:20px;">
          <tr>
            <td style="width:50%;padding-right:10px;vertical-align:top;">
              <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 5px;">Contractor Signature</p>
              ${contract.contractor_signature_url ? `<img src="${contract.contractor_signature_url}" style="height:80px;border:1px solid #ddd;border-radius:4px;background:white;" />` : '<p style="color:#aaa;font-size:12px;">Not signed</p>'}
              ${contract.contractor_signed_at ? `<p style="font-size:10px;color:#888;margin:3px 0 0;">Signed ${new Date(contract.contractor_signed_at).toLocaleDateString()}</p>` : ""}
            </td>
            <td style="width:50%;padding-left:10px;vertical-align:top;">
              <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 5px;">Customer Signature</p>
              <img src="${customerSigUrl}" style="height:80px;border:1px solid #ddd;border-radius:4px;background:white;" />
              <p style="font-size:10px;color:#888;margin:3px 0 0;">Signed ${new Date().toLocaleDateString()}</p>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-top:20px;">
        <p style="font-size:10px;color:#aaa;">Contract #${contract.id.slice(0, 8).toUpperCase()} | Generated by XRoof</p>
      </div>
    </div>
  `

  // Send to contractor email and admin
  const recipients = [contract.contractor_email].filter(Boolean) as string[]
  if (contract.customer_email) recipients.push(contract.customer_email)

  await resend.emails.send({
    from: `${contract.contractor_company || contract.contractor_name || "XRoof"} via XRoof <contracts@xroof.io>`,
    to: recipients,
    subject: `Contract Signed — ${contract.customer_name} | ${contract.project_address}`,
    html,
  })

  return NextResponse.json({ success: true })
}
