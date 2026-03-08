import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { contract_id } = await req.json()
  if (!contract_id) {
    return NextResponse.json({ error: "Missing contract_id" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: contract, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contract_id)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 })
  }

  const terms = contract.terms || {}
  const scopeItems = (terms.scope_items || [])
    .filter((i: any) => i.checked)
    .map((i: any) => `<li style="margin-bottom:4px;">${i.label}</li>`)
    .join("")

  const depositAmt = ((contract.contract_price * contract.deposit_percent) / 100).toLocaleString()
  const finalAmt = ((contract.contract_price * (100 - contract.deposit_percent)) / 100).toLocaleString()

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#111;">
      <div style="text-align:center;border-bottom:2px solid #e5e5e5;padding-bottom:15px;margin-bottom:20px;">
        <p style="font-size:11px;letter-spacing:2px;color:#888;margin:0;">ROOFING CONTRACT AGREEMENT</p>
        <h1 style="font-size:22px;margin:5px 0 0;">XRoof</h1>
        <p style="font-size:10px;color:#aaa;margin:3px 0 0;">Contract #${contract.id.slice(0, 8).toUpperCase()}</p>
      </div>

      <table style="width:100%;margin-bottom:20px;">
        <tr>
          <td style="vertical-align:top;width:50%;padding-right:10px;">
            <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 5px;">Contractor</p>
            <p style="margin:2px 0;font-size:13px;">${contract.contractor_name}</p>
            ${contract.contractor_company ? `<p style="margin:2px 0;font-size:13px;">${contract.contractor_company}</p>` : ""}
            ${contract.contractor_phone ? `<p style="margin:2px 0;font-size:13px;">${contract.contractor_phone}</p>` : ""}
            ${contract.contractor_email ? `<p style="margin:2px 0;font-size:13px;">${contract.contractor_email}</p>` : ""}
            ${contract.contractor_address ? `<p style="margin:2px 0;font-size:13px;">${contract.contractor_address}</p>` : ""}
          </td>
          <td style="vertical-align:top;width:50%;padding-left:10px;">
            <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 5px;">Customer</p>
            <p style="margin:2px 0;font-size:13px;">${contract.customer_name}</p>
            <p style="margin:2px 0;font-size:13px;">${contract.project_address}</p>
            <p style="margin:2px 0;font-size:13px;color:#888;">Date: ${new Date(contract.contract_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          </td>
        </tr>
      </table>

      <h3 style="font-size:14px;margin:20px 0 8px;">Scope of Work</h3>
      <p style="font-size:12px;color:#555;margin:0 0 5px;">Contractor agrees to provide roofing services including:</p>
      <ul style="font-size:12px;color:#333;padding-left:20px;margin:0 0 5px;">${scopeItems}</ul>
      ${terms.scope_custom_text ? `<p style="font-size:12px;color:#333;margin:5px 0;">${terms.scope_custom_text}</p>` : ""}
      <p style="font-size:11px;color:#888;">All work will follow manufacturer installation guidelines and industry standards.</p>

      <h3 style="font-size:14px;margin:20px 0 8px;">Contract Price</h3>
      <p style="font-size:18px;font-weight:bold;margin:0;">$${Number(contract.contract_price).toLocaleString()}</p>

      <h3 style="font-size:14px;margin:20px 0 8px;">Payment Terms</h3>
      <p style="font-size:12px;margin:0 0 5px;">
        <strong>Deposit:</strong> ${contract.deposit_percent}% ($${depositAmt}) due upon signing<br/>
        <strong>Final Payment:</strong> ${100 - contract.deposit_percent}% ($${finalAmt}) due upon completion
      </p>
      <p style="font-size:11px;color:#555;">${terms.payment_terms_text || ""}</p>

      ${terms.work_start_date ? `<h3 style="font-size:14px;margin:20px 0 8px;">Work Start Date</h3><p style="font-size:12px;font-weight:bold;">${new Date(terms.work_start_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>` : ""}

      <h3 style="font-size:14px;margin:20px 0 8px;">Scheduling & Delays</h3>
      <p style="font-size:11px;color:#555;">${terms.scheduling_text || ""}</p>

      <h3 style="font-size:14px;margin:20px 0 8px;">Hidden Damage</h3>
      <p style="font-size:11px;color:#555;">${terms.hidden_damage_text || ""}</p>

      <h3 style="font-size:14px;margin:20px 0 8px;">Subcontractors</h3>
      <p style="font-size:11px;color:#555;">${terms.subcontractors_text || ""}</p>

      <h3 style="font-size:14px;margin:20px 0 8px;">Warranty</h3>
      <p style="font-size:12px;margin:0 0 3px;"><strong>Workmanship warranty:</strong> ${terms.warranty_years || 5} years</p>
      <p style="font-size:11px;color:#555;">${terms.warranty_text || ""}</p>

      <h3 style="font-size:14px;margin:20px 0 8px;">Governing Law</h3>
      <p style="font-size:11px;color:#555;">This agreement shall be governed by the laws of the State of ${terms.governing_state || "Wisconsin"}.</p>

      <div style="margin-top:25px;padding:12px;background:#f5f5f5;border-radius:6px;">
        <p style="font-size:11px;font-weight:bold;margin:0;">By signing below, both parties agree to all terms and conditions outlined in this contract.</p>
      </div>

      <table style="width:100%;margin-top:20px;">
        <tr>
          <td style="width:50%;padding-right:10px;vertical-align:top;">
            <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 5px;">Contractor Signature</p>
            ${contract.contractor_signature_url ? `<img src="${contract.contractor_signature_url}" style="height:80px;border:1px solid #ddd;border-radius:4px;background:white;" />` : '<p style="color:#aaa;font-size:12px;">Not signed</p>'}
            ${contract.contractor_signed_at ? `<p style="font-size:10px;color:#888;margin:3px 0 0;">Signed ${new Date(contract.contractor_signed_at).toLocaleDateString()}</p>` : ""}
          </td>
          <td style="width:50%;padding-left:10px;vertical-align:top;">
            <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 5px;">Customer Signature</p>
            ${contract.customer_signature_url ? `<img src="${contract.customer_signature_url}" style="height:80px;border:1px solid #ddd;border-radius:4px;background:white;" />` : '<p style="color:#aaa;font-size:12px;">Not signed</p>'}
            ${contract.customer_signed_at ? `<p style="font-size:10px;color:#888;margin:3px 0 0;">Signed ${new Date(contract.customer_signed_at).toLocaleDateString()}</p>` : ""}
          </td>
        </tr>
      </table>

      <div style="text-align:center;margin-top:30px;padding-top:15px;border-top:1px solid #eee;">
        <p style="font-size:10px;color:#aaa;">Generated by XRoof | Contract #${contract.id.slice(0, 8).toUpperCase()}</p>
      </div>
    </div>
  `

  const { error: sendError } = await resend.emails.send({
    from: "XRoof Contracts <onboarding@resend.dev>",
    to: "contact@leons-roofing.com",
    subject: `Signed Contract — ${contract.customer_name} | ${contract.project_address}`,
    html,
  })

  if (sendError) {
    return NextResponse.json({ error: sendError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
