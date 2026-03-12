import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params

  // Token-based lookup for public estimate page
  const url = new URL(request.url)
  const token = url.searchParams.get("token")

  if (token) {
    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("viewing_token", token)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 })
    }

    if (report.viewing_token_expires_at && new Date(report.viewing_token_expires_at) < new Date()) {
      return NextResponse.json({ error: "expired" }, { status: 410 })
    }

    let contractorName = "Unknown"
    let brandColor = "#059669"
    let logoUrl = ""
    if (report.contractor_id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("username, widget_color, logo_url")
        .eq("id", report.contractor_id)
        .single()
      if (profile) {
        contractorName = profile.username
        brandColor = profile.widget_color || brandColor
        logoUrl = profile.logo_url || ""
      }
    }

    return NextResponse.json({ ...report, contractor_name: contractorName, brand_color: brandColor, brand_logo_url: logoUrl })
  }

  // Standard ID-based lookup
  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  let contractorName = "Unknown"
  let brandColor = "#059669"
  let logoUrl = ""
  if (data.contractor_id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, widget_color, logo_url")
      .eq("id", data.contractor_id)
      .single()
    if (profile) {
      contractorName = profile.username
      brandColor = profile.widget_color || brandColor
      logoUrl = profile.logo_url || ""
    }
  }

  return NextResponse.json({ ...data, contractor_name: contractorName, brand_color: brandColor, brand_logo_url: logoUrl })
}
