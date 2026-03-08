import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: Promise<{ contractorId: string }> }) {
  const { contractorId } = await params
  if (!contractorId) {
    return NextResponse.json({ error: "Missing contractorId" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, job_id, status, contract_date, customer_name, project_address")
    .eq("contractor_id", contractorId)
    .order("contract_date", { ascending: false })

  return NextResponse.json(contracts || [])
}
