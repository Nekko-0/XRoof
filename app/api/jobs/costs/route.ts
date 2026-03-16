import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get("job_id")
  if (!jobId) return NextResponse.json({ error: "Missing job_id" }, { status: 400 })

  const supabase = getServiceSupabase()

  // Verify job ownership
  const { data: job } = await supabase.from("jobs").select("contractor_id").eq("id", jobId).single()
  if (!job || job.contractor_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("job_costs")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { job_id, category, description, amount } = body
  if (!job_id || !category || amount == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Verify job ownership
  const { data: job } = await supabase.from("jobs").select("contractor_id").eq("id", job_id).single()
  if (!job || job.contractor_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("job_costs")
    .insert({ job_id, category, description: description || null, amount })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getServiceSupabase()

  // Verify ownership before deleting
  const { data: cost } = await supabase.from("job_costs").select("id, job_id").eq("id", id).single()
  if (!cost) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: job } = await supabase.from("jobs").select("contractor_id").eq("id", cost.job_id).single()
  if (!job || job.contractor_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await supabase.from("job_costs").delete().eq("id", id)
  return NextResponse.json({ success: true })
}
