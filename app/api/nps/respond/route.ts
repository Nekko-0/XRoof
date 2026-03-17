import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/api-auth"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  let body: { user_id?: string; score?: number; comment?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { user_id, score, comment } = body

  if (!user_id || !UUID_RE.test(user_id)) {
    return NextResponse.json({ error: "Invalid user_id" }, { status: 400 })
  }

  if (score === undefined || typeof score !== "number" || score < 0 || score > 10 || !Number.isInteger(score)) {
    return NextResponse.json({ error: "Score must be an integer 0-10" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { error } = await supabase.from("nps_responses").insert({
    user_id,
    score,
    comment: comment?.trim() || null,
  })

  if (error) {
    console.error("Error inserting NPS response:", error)
    return NextResponse.json({ error: "Failed to save response" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
