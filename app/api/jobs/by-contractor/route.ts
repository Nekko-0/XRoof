import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("jobs")
    .select("id, address, status, job_type, budget, created_at, customer_name")
    .eq("contractor_id", userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
