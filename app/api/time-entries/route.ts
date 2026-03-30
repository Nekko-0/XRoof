import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const supabase = getServiceSupabase()
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get("job_id")
  const activeOnly = searchParams.get("active") === "true"

  let query = supabase
    .from("time_entries")
    .select("id, job_id, work_order_id, user_id, user_name, started_at, ended_at, duration_minutes, notes, created_at")
    .eq("contractor_id", userId)
    .order("started_at", { ascending: false })

  if (jobId) query = query.eq("job_id", jobId)
  if (activeOnly) query = query.is("ended_at", null)

  const { data, error } = await query.limit(100)
  if (error) {
    console.error("[XRoof] time-entries GET error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const body = await req.json()
  const { action, job_id, work_order_id, notes, entry_id } = body

  const supabase = getServiceSupabase()

  // Get user name
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, username")
    .eq("id", userId)
    .single()

  const userName = profile?.company_name || profile?.username || "User"

  if (action === "clock_in") {
    // Check for existing active entry on this job
    const { data: existing } = await supabase
      .from("time_entries")
      .select("id")
      .eq("contractor_id", userId)
      .eq("job_id", job_id)
      .is("ended_at", null)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Already clocked in on this job" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        contractor_id: userId,
        job_id,
        work_order_id: work_order_id || null,
        user_id: userId,
        user_name: userName,
        started_at: new Date().toISOString(),
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error("[XRoof] time-entries clock_in error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
    return NextResponse.json(data)
  }

  if (action === "clock_out") {
    if (!entry_id) {
      return NextResponse.json({ error: "Missing entry_id" }, { status: 400 })
    }

    // Get the entry
    const { data: entry } = await supabase
      .from("time_entries")
      .select("id, started_at")
      .eq("id", entry_id)
      .eq("contractor_id", userId)
      .single()

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    const endedAt = new Date()
    const startedAt = new Date(entry.started_at)
    const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)

    const { data, error } = await supabase
      .from("time_entries")
      .update({
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes,
        notes: notes || undefined,
      })
      .eq("id", entry_id)
      .select()
      .single()

    if (error) {
      console.error("[XRoof] time-entries clock_out error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: "Invalid action. Use clock_in or clock_out." }, { status: 400 })
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getServiceSupabase()
  const { data: entry } = await supabase.from("time_entries").select("contractor_id").eq("id", id).single()
  if (!entry || entry.contractor_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await supabase.from("time_entries").delete().eq("id", id)
  return NextResponse.json({ success: true })
}
