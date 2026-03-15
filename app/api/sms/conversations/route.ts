import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

// GET — list SMS conversations for the authenticated contractor
export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServiceSupabase()

  // Get all unique phone numbers this contractor has SMS messages with
  const { data: messages } = await supabase
    .from("sms_messages")
    .select("phone_number, customer_name, job_id, body, direction, created_at")
    .eq("contractor_id", auth.userId)
    .order("created_at", { ascending: false })

  if (!messages || messages.length === 0) {
    return NextResponse.json({ conversations: [] })
  }

  // Group by phone number, take latest message per conversation
  const convMap = new Map<string, {
    phone_number: string
    customer_name: string | null
    job_id: string | null
    last_message: string
    last_direction: string
    last_time: string
    unread_count: number
    message_count: number
  }>()

  for (const msg of messages) {
    const existing = convMap.get(msg.phone_number)
    if (!existing) {
      convMap.set(msg.phone_number, {
        phone_number: msg.phone_number,
        customer_name: msg.customer_name,
        job_id: msg.job_id,
        last_message: msg.body,
        last_direction: msg.direction,
        last_time: msg.created_at,
        unread_count: msg.direction === "inbound" ? 1 : 0,
        message_count: 1,
      })
    } else {
      existing.message_count++
      if (msg.direction === "inbound") existing.unread_count++
      // Update customer name if we have one and existing doesn't
      if (msg.customer_name && !existing.customer_name) {
        existing.customer_name = msg.customer_name
      }
    }
  }

  const conversations = Array.from(convMap.values())
    .sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime())

  return NextResponse.json({ conversations })
}
