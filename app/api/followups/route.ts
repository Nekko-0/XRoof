import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get("job_id")

  const supabase = getServiceSupabase()

  // If filtering by job, verify ownership first
  if (jobId) {
    const { data: job } = await supabase.from("jobs").select("contractor_id").eq("id", jobId).single()
    if (!job || job.contractor_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  let query = supabase.from("followups").select("*, jobs(customer_name, address)").order("due_date", { ascending: true })

  if (jobId) {
    query = query.eq("job_id", jobId)
  } else {
    query = query.eq("user_id", userId).eq("completed", false)
  }

  const { data, error } = await query.limit(500)
  if (error) return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { job_id, due_date, note } = await req.json()
  if (!job_id || !due_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Verify job ownership
  const { data: job } = await supabase.from("jobs").select("contractor_id").eq("id", job_id).single()
  if (!job || job.contractor_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("followups")
    .insert({ job_id, user_id: userId, due_date, note: note || "" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { id, completed } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getServiceSupabase()

  // Verify ownership via followup's user_id
  const { data: followup } = await supabase.from("followups").select("user_id").eq("id", id).single()
  if (!followup || followup.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { error } = await supabase.from("followups").update({ completed }).eq("id", id)

  if (error) return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  return NextResponse.json({ success: true })
}
