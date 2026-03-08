import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
  }

  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, customer_name, customer_phone, address, zip_code, job_type, description, budget")
    .eq("id", jobId)
    .maybeSingle()

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    contract: contract || null,
    job: job || null,
    debug: {
      hasServiceKey,
      jobError: jobError?.message || null,
      contractError: contractError?.message || null,
    },
  })
}
