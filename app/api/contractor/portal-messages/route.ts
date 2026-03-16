import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { searchParams } = new URL(req.url)
  const job_id = searchParams.get("job_id")

  const supabase = getServiceSupabase()

  if (job_id) {
    // Verify contractor owns this job
    const { data: job } = await supabase.from("jobs").select("id").eq("id", job_id).eq("contractor_id", userId).single()
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })

    const { data: messages } = await supabase
      .from("portal_messages")
      .select("id, job_id, sender, message, created_at")
      .eq("job_id", job_id)
      .order("created_at", { ascending: true })

    return NextResponse.json({ messages: messages || [] })
  }

  // No job_id — return all portal threads for this contractor's jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, customer_name")
    .eq("contractor_id", userId)

  if (!jobs || jobs.length === 0) return NextResponse.json({ threads: [] })

  const jobIds = jobs.map((j) => j.id)
  const { data: allMessages } = await supabase
    .from("portal_messages")
    .select("id, job_id, sender, message, created_at")
    .in("job_id", jobIds)
    .order("created_at", { ascending: false })

  // Group by job_id — return latest message per thread
  const threadMap: Record<string, { job_id: string; customer_name: string; last_message: string; last_sender: string; last_time: string; count: number }> = {}
  for (const msg of allMessages || []) {
    if (!threadMap[msg.job_id]) {
      const job = jobs.find((j) => j.id === msg.job_id)
      threadMap[msg.job_id] = {
        job_id: msg.job_id,
        customer_name: job?.customer_name || "Customer",
        last_message: msg.message,
        last_sender: msg.sender,
        last_time: msg.created_at,
        count: 0,
      }
    }
    threadMap[msg.job_id].count++
  }

  const threads = Object.values(threadMap).sort(
    (a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime()
  )

  return NextResponse.json({ threads })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const body = await req.json()
  const { job_id, message } = body

  if (!job_id || !message) {
    return NextResponse.json({ error: "Missing job_id or message" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Verify contractor owns this job
  const { data: job } = await supabase.from("jobs").select("id").eq("id", job_id).eq("contractor_id", userId).single()
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })

  const { data: row, error } = await supabase
    .from("portal_messages")
    .insert({ job_id, sender: "contractor", message })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: row })
}
