import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("appointments")
    .select("id, contractor_id, job_id, title, date, time, type, notes, created_at")
    .eq("contractor_id", userId)
    .order("date", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const body = await req.json()
  const { job_id, title, date, time, type, notes } = body
  if (!title || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("appointments")
    .insert({ contractor_id: userId, job_id: job_id || null, title, date, time: time || null, type: type || "site_visit", notes: notes || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getServiceSupabase()
  // Verify ownership
  const { data: appt } = await supabase.from("appointments").select("contractor_id").eq("id", id).single()
  if (!appt || appt.contractor_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await supabase.from("appointments").delete().eq("id", id)
  return NextResponse.json({ success: true })
}
