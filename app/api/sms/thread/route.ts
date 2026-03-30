import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"
import { sendSMS } from "@/lib/twilio"
import { SMSSendSchema, validateBody } from "@/lib/validations"
import { rateLimit } from "@/lib/rate-limit"

// GET — get all messages in a conversation with a specific phone number
export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const phone = searchParams.get("phone")

  if (!phone) {
    return NextResponse.json({ error: "Missing phone parameter" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: messages } = await supabase
    .from("sms_messages")
    .select("id, direction, body, customer_name, created_at, status")
    .eq("contractor_id", auth.userId)
    .eq("phone_number", phone)
    .order("created_at", { ascending: true })

  return NextResponse.json({ messages: messages || [] })
}

// POST — send a reply SMS and store it
export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // Rate limit: 10 SMS per minute per user
  const rl = rateLimit(`sms:${auth.userId}`, 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many SMS requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } })
  }

  const body = await req.json()
  const v = validateBody(SMSSendSchema, body)
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 })
  const { phone, message, job_id } = v.data!

  const supabase = getServiceSupabase()

  // Format phone for Twilio (add +1 if needed)
  const formattedPhone = phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`

  // Send via Twilio
  const result = await sendSMS(formattedPhone, message)

  if (!result) {
    return NextResponse.json({ error: "Failed to send SMS. Check Twilio configuration." }, { status: 500 })
  }

  // Look up customer name from existing messages or jobs
  let customerName: string | null = null
  const { data: existing } = await supabase
    .from("sms_messages")
    .select("customer_name")
    .eq("phone_number", phone.replace(/\D/g, ""))
    .not("customer_name", "is", null)
    .limit(1)
    .maybeSingle()

  if (existing?.customer_name) {
    customerName = existing.customer_name
  }

  // Store outbound message
  const { data: stored, error } = await supabase
    .from("sms_messages")
    .insert({
      contractor_id: auth.userId,
      job_id: job_id || null,
      phone_number: phone.replace(/\D/g, ""),
      direction: "outbound",
      body: message,
      customer_name: customerName,
      twilio_sid: result.sid || null,
      status: "sent",
    })
    .select("id, direction, body, customer_name, created_at, status")
    .single()

  if (error) {
    console.error("[XRoof] sms-thread POST error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  return NextResponse.json({ message: stored })
}
