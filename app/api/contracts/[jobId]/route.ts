import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // Check if this is a token-based lookup (for public signing page)
  const url = new URL(req.url)
  const token = url.searchParams.get("token")

  if (token) {
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("signing_token", token)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: "Invalid signing link" }, { status: 404 })
    }

    // Check expiry
    if (contract.signing_token_expires_at && new Date(contract.signing_token_expires_at) < new Date()) {
      return NextResponse.json({ error: "expired" }, { status: 410 })
    }

    // Check if already signed
    if (contract.status === "signed") {
      return NextResponse.json({ error: "already_signed", contract }, { status: 409 })
    }

    // Fetch job for additional info
    const { data: job } = await supabase
      .from("jobs")
      .select("id, customer_name, customer_phone, address, zip_code, job_type, description, budget")
      .eq("id", contract.job_id)
      .maybeSingle()

    return NextResponse.json({ contract, job })
  }

  // Standard jobId-based lookup (for admin/contractor pages)
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

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
