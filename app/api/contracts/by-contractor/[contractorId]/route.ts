import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request, { params }: { params: Promise<{ contractorId: string }> }) {
  const { contractorId } = await params
  if (!contractorId) {
    return NextResponse.json({ error: "Missing contractorId" }, { status: 400 })
  }

  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // Only allow fetching your own contracts
  if (auth.userId !== contractorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabase = getServiceSupabase()

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, job_id, status, contract_date, customer_name, project_address")
    .eq("contractor_id", contractorId)
    .order("contract_date", { ascending: false })

  return NextResponse.json(contracts || [])
}
