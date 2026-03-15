import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get("job_id")
  if (!jobId) return NextResponse.json({ error: "Missing job_id" }, { status: 400 })

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("job_photos")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { job_id, url, caption, category } = await req.json()
  if (!job_id || !url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("job_photos")
    .insert({ job_id, contractor_id: userId, url, caption: caption || "", category: category || "before" })
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
  const { data: photo } = await supabase.from("job_photos").select("id, job_id").eq("id", id).single()
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: job } = await supabase.from("jobs").select("contractor_id").eq("id", photo.job_id).single()
  if (!job || job.contractor_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { error } = await supabase.from("job_photos").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
