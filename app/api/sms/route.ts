import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

// Twilio SMS API route
export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { to, message, type } = await req.json()

  if (!to || !message) {
    return NextResponse.json({ error: "Missing 'to' or 'message'" }, { status: 400 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json({ error: "SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment variables." }, { status: 500 })
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message,
      }),
    })

    const data = await res.json()

    if (data.error_code) {
      return NextResponse.json({ error: data.message || "Failed to send SMS" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      sid: data.sid,
      status: data.status,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "SMS send failed" }, { status: 500 })
  }
}
