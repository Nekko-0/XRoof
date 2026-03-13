import { createClient } from "@supabase/supabase-js"
import { createHmac } from "crypto"
import { rateLimit, getClientIP } from "@/lib/rate-limit"
import { emitToUser } from "@/lib/event-emitter"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function validateTwilioSignature(url: string, params: URLSearchParams, signature: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return false

  // Twilio signature: sort params alphabetically, append key+value to URL, HMAC-SHA1, base64
  const sortedKeys = Array.from(params.keys()).sort()
  let dataString = url
  for (const key of sortedKeys) {
    dataString += key + params.get(key)
  }

  const computed = createHmac("sha1", authToken)
    .update(dataString)
    .digest("base64")

  return computed === signature
}

// Twilio sends inbound SMS as application/x-www-form-urlencoded POST
export async function POST(req: Request) {
  // Rate limit: 60 webhook calls per minute per IP
  const ip = getClientIP(req)
  const rl = rateLimit(`webhook:${ip}`, 60, 60_000)
  if (!rl.allowed) {
    return new Response("<Response></Response>", { status: 429, headers: { "Content-Type": "text/xml" } })
  }

  const formData = await req.text()
  const params = new URLSearchParams(formData)

  // Verify Twilio signature to prevent spoofed requests
  const signature = req.headers.get("x-twilio-signature") || ""
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/webhook`
  if (!validateTwilioSignature(webhookUrl, params, signature)) {
    return new Response("Forbidden", { status: 403 })
  }

  const from = params.get("From") || ""
  const body = params.get("Body") || ""
  const twilioSid = params.get("MessageSid") || ""

  if (!from || !body) {
    // Return TwiML empty response
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    })
  }

  // Normalize phone number (strip +1 prefix for matching)
  const normalizedPhone = from.replace(/^\+1/, "").replace(/\D/g, "")

  // Try to match to a customer by phone number in jobs table
  const { data: matchedJobs } = await supabase
    .from("jobs")
    .select("id, contractor_id, customer_name, customer_phone")
    .or(`customer_phone.ilike.%${normalizedPhone}%`)
    .order("created_at", { ascending: false })
    .limit(5)

  let contractorId: string | null = null
  let jobId: string | null = null
  let customerName: string | null = null

  if (matchedJobs && matchedJobs.length > 0) {
    // Use the most recent job
    const match = matchedJobs[0]
    contractorId = match.contractor_id
    jobId = match.id
    customerName = match.customer_name
  }

  if (!contractorId) {
    // Could not match — try matching by any existing SMS conversation
    const { data: existingSms } = await supabase
      .from("sms_messages")
      .select("contractor_id, job_id, customer_name")
      .eq("phone_number", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingSms) {
      contractorId = existingSms.contractor_id
      jobId = existingSms.job_id
      customerName = existingSms.customer_name
    }
  }

  if (!contractorId) {
    // Last resort — could not match to any contractor. Log and return.
    console.warn("[XRoof SMS] Inbound from unmatched number:", from)
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    })
  }

  // Store inbound message
  await supabase.from("sms_messages").insert({
    contractor_id: contractorId,
    job_id: jobId,
    phone_number: normalizedPhone,
    direction: "inbound",
    body,
    customer_name: customerName,
    twilio_sid: twilioSid,
    status: "received",
  })

  // Emit real-time SSE event
  emitToUser(contractorId, {
    type: "sms_received",
    payload: { phone: normalizedPhone, body, customerName },
  })

  // Return empty TwiML (no auto-reply)
  return new Response("<Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  })
}
