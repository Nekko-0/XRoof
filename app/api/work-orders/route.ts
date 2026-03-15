import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"
import { WorkOrderCreateSchema, WorkOrderUpdateSchema, validateBody } from "@/lib/validations"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const contractorId = searchParams.get("contractor_id")
  const jobId = searchParams.get("job_id")

  if (!contractorId && !jobId) {
    return NextResponse.json({ error: "Missing contractor_id or job_id" }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  let query = supabase
    .from("work_orders")
    .select("*, jobs(customer_name, address)")
    .order("created_at", { ascending: false })

  if (jobId) {
    query = query.eq("job_id", jobId)
  } else if (contractorId) {
    query = query.eq("contractor_id", contractorId)
  }

  const { data, error } = await query.limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const v = validateBody(WorkOrderCreateSchema, body)
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 })
  const { job_id, contractor_id, assigned_to, assigned_name, title, description, priority, due_date } = v.data!

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      job_id: job_id || null,
      contractor_id,
      assigned_to: assigned_to || null,
      assigned_name: assigned_name || null,
      title,
      description: description || null,
      priority: priority || "normal",
      due_date: due_date || null,
    })
    .select("*, jobs(customer_name, address)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const v = validateBody(WorkOrderUpdateSchema, body)
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 })
  const { id, ...updates } = v.data!

  // Auto-set completed_at when status changes to completed
  if (updates.status === "completed" && !updates.completed_at) {
    updates.completed_at = new Date().toISOString()
  }
  if (updates.status && updates.status !== "completed") {
    updates.completed_at = null
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("work_orders")
    .update(updates)
    .eq("id", id)
    .select("*, jobs(customer_name, address)")
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
  const { error } = await supabase.from("work_orders").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
