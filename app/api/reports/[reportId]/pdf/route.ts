import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateProposalPdf } from "@/lib/pdf/generate-proposal"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Allow up to 30s for PDF generation (images + rendering)
export const maxDuration = 30

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params
  const url = new URL(request.url)
  const token = url.searchParams.get("token")

  let report: Record<string, unknown> | null = null

  if (token) {
    // Public access via viewing token
    const { data, error } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("viewing_token", token)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 })
    }

    if (data.viewing_token_expires_at && new Date(data.viewing_token_expires_at) < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 })
    }

    report = data
  } else {
    // Authenticated access — verify auth via Bearer token
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const jwt = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt)
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    report = data
  }

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  // Fetch contractor profile for branding
  const contractorId = report.contractor_id as string
  let profile: Record<string, unknown> = {}

  if (contractorId) {
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("company_name, widget_color, logo_url, phone, email, business_address, license_number")
      .eq("id", contractorId)
      .single()

    if (p) profile = p
  }

  try {
    const pdfBuffer = await generateProposalPdf({ report, profile })

    const customerName = (report.customer_name as string) || "estimate"
    const filename = `Proposal-${customerName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-")}.pdf`

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (err) {
    console.error("PDF generation error:", err)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
