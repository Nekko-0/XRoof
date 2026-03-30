import { Resend } from "resend"
import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

const resend = new Resend(process.env.RESEND_API_KEY)

const SAMPLE_DATA: Record<string, string> = {
  "{customer_name}": "John Smith",
  "{company_name}": "Your Company",
  "{address}": "123 Main St",
  "{phone}": "(555) 123-4567",
}

function replacePlaceholders(text: string): string {
  let result = text
  for (const [placeholder, value] of Object.entries(SAMPLE_DATA)) {
    result = result.replaceAll(placeholder, value)
  }
  return result
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { type, subject, body, recipient } = await req.json()

  if (!type || !body || !recipient) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const renderedBody = replacePlaceholders(body)
  const renderedSubject = subject ? replacePlaceholders(subject) : ""

  if (type === "sms") {
    return NextResponse.json({
      success: true,
      preview: true,
      rendered_message: renderedBody,
    })
  }

  // Get sender's company name
  const supabase = getServiceSupabase()
  const { data: profile } = await supabase.from("profiles").select("company_name").eq("id", userId).single()
  const senderName = profile?.company_name || "XRoof"

  if (type === "email") {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">
        <div style="text-align:center;border-bottom:2px solid #e5e5e5;padding-bottom:15px;margin-bottom:20px;">
          <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#0891b2;margin:0 0 5px;">Test Email</p>
          <h1 style="font-size:20px;margin:0;">${renderedSubject || "Automation Step Preview"}</h1>
        </div>
        <p style="font-size:14px;color:#333;white-space:pre-wrap;">${renderedBody}</p>
        <div style="border-top:1px solid #eee;padding-top:15px;margin-top:30px;">
          <p style="font-size:10px;color:#aaa;margin:0;">This is a test email from your XRoof automation. Placeholders have been replaced with sample data.</p>
        </div>
      </div>
    `

    const { error: sendError } = await resend.emails.send({
      from: `${senderName} via XRoof <contracts@xroof.io>`,
      to: recipient,
      subject: `[TEST] ${renderedSubject || "Automation Step Preview"}`,
      html,
    })

    if (sendError) {
      return NextResponse.json({ error: "Failed to send test email: " + sendError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, sent_to: recipient })
  }

  return NextResponse.json({ error: "Unsupported step type for testing" }, { status: 400 })
}
