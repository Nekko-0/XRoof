import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get("job_id")
  if (!jobId) return NextResponse.json({ error: "Missing job_id" }, { status: 400 })

  // Verify the job belongs to the authenticated user
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("contractor_id", userId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("job_activities")
    .select("id, job_id, contractor_id, activity_type, description, metadata, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[XRoof] activities GET error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
  return NextResponse.json({ activities: data ?? [] })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const { job_id, activity_type, description, metadata } = await req.json()
  if (!job_id || !activity_type || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("job_activities")
    .insert({ job_id, contractor_id: userId, activity_type, description, metadata })
    .select()
    .single()

  if (error) {
    console.error("[XRoof] activities POST error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
  return NextResponse.json(data)
}
