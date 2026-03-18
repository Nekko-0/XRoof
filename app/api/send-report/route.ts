import { Resend } from "resend"
import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const body = await req.json()
  const { contractorName, customerName, customerAddress, jobType, priceQuote, scopeOfWork } = body

  if (!customerName || !customerAddress || !scopeOfWork) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Get contractor email
  const supabase = getServiceSupabase()
  const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single()
  const recipientEmail = profile?.email || "noreply@xroof.io"

  const { error } = await resend.emails.send({
    from: `${contractorName || "XRoof"} via XRoof <contracts@xroof.io>`,
    to: recipientEmail,
    subject: `New Report from ${contractorName || "Contractor"} — ${customerName}`,
    html: `
      <h2>New Contractor Report</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Contractor</td><td style="padding:8px;border-bottom:1px solid #eee;">${contractorName || "N/A"}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Customer</td><td style="padding:8px;border-bottom:1px solid #eee;">${customerName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Address</td><td style="padding:8px;border-bottom:1px solid #eee;">${customerAddress}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Job Type</td><td style="padding:8px;border-bottom:1px solid #eee;">${jobType || "N/A"}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Price / Quote</td><td style="padding:8px;border-bottom:1px solid #eee;">${priceQuote ? "$" + Number(priceQuote).toLocaleString() : "Not provided"}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;vertical-align:top;">Scope of Work</td><td style="padding:8px;white-space:pre-wrap;">${scopeOfWork}</td></tr>
      </table>
    `,
  })

  if (error) {
    console.error("[XRoof] send-report POST error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
