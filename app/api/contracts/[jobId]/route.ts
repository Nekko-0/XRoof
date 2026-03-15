import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Check if this is a token-based lookup (for public signing page)
  const url = new URL(req.url)
  const token = url.searchParams.get("token")

  if (token) {
    // Public access via signing token — no auth required
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("signing_token", token)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: "Invalid signing link" }, { status: 404 })
    }

    if (contract.signing_token_expires_at && new Date(contract.signing_token_expires_at) < new Date()) {
      return NextResponse.json({ error: "expired" }, { status: 410 })
    }

    if (contract.status === "signed") {
      return NextResponse.json({ error: "already_signed", contract }, { status: 409 })
    }

    const { data: job } = await supabase
      .from("jobs")
      .select("id, customer_name, customer_phone, address, zip_code, job_type, description, budget")
      .eq("id", contract.job_id)
      .maybeSingle()

    // Fetch branding
    let brand_color = "#059669"
    let brand_logo_url = ""
    if (contract.contractor_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("widget_color, logo_url")
        .eq("id", contract.contractor_id)
        .single()
      if (profile) {
        brand_color = profile.widget_color || brand_color
        brand_logo_url = profile.logo_url || ""
      }
    }

    return NextResponse.json({ contract, job, brand_color, brand_logo_url })
  }

  // Standard jobId-based lookup — requires auth
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { data: job } = await supabase
    .from("jobs")
    .select("id, contractor_id, customer_name, customer_phone, address, zip_code, job_type, description, budget")
    .eq("id", jobId)
    .maybeSingle()

  // Verify the authenticated user owns this job
  if (job && job.contractor_id !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    contract: contract || null,
    job: job || null,
  })
}
