import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(req.url)
    const subcontractorId = searchParams.get("subcontractor_id")

    const supabase = getServiceSupabase()

    if (subcontractorId) {
      // Verify contractor owns this subcontractor
      const { data: sub } = await supabase
        .from("subcontractors")
        .select("id")
        .eq("id", subcontractorId)
        .eq("contractor_id", auth.userId)
        .single()

      if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 })

      // Get all job assignments for this sub with job details
      const { data, error } = await supabase
        .from("job_subcontractors")
        .select("id, assigned_at, notes, job_id, jobs(id, customer_name, address, status, scheduled_date, completed_at)")
        .eq("subcontractor_id", subcontractorId)
        .order("assigned_at", { ascending: false })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data || [])
    }

    // Get all assignments for all of contractor's subs (bulk fetch for page)
    const { data: subs } = await supabase
      .from("subcontractors")
      .select("id")
      .eq("contractor_id", auth.userId)

    if (!subs || subs.length === 0) return NextResponse.json([])

    const subIds = subs.map((s) => s.id)
    const { data, error } = await supabase
      .from("job_subcontractors")
      .select("id, assigned_at, notes, subcontractor_id, job_id, jobs(id, customer_name, address, status, scheduled_date, completed_at)")
      .in("subcontractor_id", subIds)
      .order("assigned_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err) {
    console.error("[XRoof] subcontractor assignments GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { job_id, subcontractor_id, notes } = await req.json()

    if (!job_id || !subcontractor_id) {
      return NextResponse.json({ error: "Missing job_id or subcontractor_id" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Verify contractor owns both job and subcontractor
    const [{ data: job }, { data: sub }] = await Promise.all([
      supabase.from("jobs").select("id").eq("id", job_id).eq("contractor_id", auth.userId).single(),
      supabase.from("subcontractors").select("id").eq("id", subcontractor_id).eq("contractor_id", auth.userId).single(),
    ])

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })
    if (!sub) return NextResponse.json({ error: "Subcontractor not found" }, { status: 404 })

    // Check for duplicate assignment
    const { count } = await supabase
      .from("job_subcontractors")
      .select("*", { count: "exact", head: true })
      .eq("job_id", job_id)
      .eq("subcontractor_id", subcontractor_id)

    if ((count || 0) > 0) {
      return NextResponse.json({ error: "Already assigned to this job" }, { status: 409 })
    }

    const { data, error } = await supabase
      .from("job_subcontractors")
      .insert({ job_id, subcontractor_id, notes: notes || null })
      .select("id, assigned_at, notes, job_id, subcontractor_id, jobs(id, customer_name, address, status, scheduled_date, completed_at)")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error("[XRoof] subcontractor assignments POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const supabase = getServiceSupabase()

    // Verify ownership: assignment → subcontractor → contractor
    const { data: assignment } = await supabase
      .from("job_subcontractors")
      .select("id, subcontractor_id, subcontractors(contractor_id)")
      .eq("id", id)
      .single()

    const contractor_id = (assignment?.subcontractors as any)?.contractor_id
    if (!assignment || contractor_id !== auth.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("job_subcontractors")
      .delete()
      .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error("[XRoof] subcontractor assignments DELETE error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
