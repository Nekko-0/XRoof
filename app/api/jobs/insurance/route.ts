import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get("job_id")
  if (!jobId) return NextResponse.json({ error: "Missing job_id" }, { status: 400 })

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("jobs")
    .select("id, is_insurance_claim, insurance_company, claim_number, adjuster_name, adjuster_phone, adjuster_email, deductible, claim_status, adjuster_meeting_date, insurance_notes")
    .eq("id", jobId)
    .eq("contractor_id", userId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const body = await req.json()
  const { job_id, ...updates } = body
  if (!job_id) return NextResponse.json({ error: "Missing job_id" }, { status: 400 })

  // Only allow insurance-related fields
  const allowed = [
    "is_insurance_claim", "insurance_company", "claim_number",
    "adjuster_name", "adjuster_phone", "adjuster_email",
    "deductible", "claim_status", "adjuster_meeting_date", "insurance_notes",
  ]
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key]
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("jobs")
    .update(filtered)
    .eq("id", job_id)
    .eq("contractor_id", userId)
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
