import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

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
    let googleReviewUrl = ""
    let googleReviewsCache: any = null
    if (report.contractor_id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("username, widget_color, logo_url, google_review_url, google_reviews_cache")
        .eq("id", report.contractor_id)
        .single()
      if (profile) {
        contractorName = profile.username
        brandColor = profile.widget_color || brandColor
        logoUrl = profile.logo_url || ""
        googleReviewUrl = profile.google_review_url || ""
        googleReviewsCache = profile.google_reviews_cache || null
      }
    }

    return NextResponse.json({ ...report, contractor_name: contractorName, brand_color: brandColor, brand_logo_url: logoUrl, google_review_url: googleReviewUrl, google_reviews_cache: googleReviewsCache })
  }

  // Standard ID-based lookup — requires authentication
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  if (data.contractor_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let contractorName = "Unknown"
  let brandColor = "#059669"
  let logoUrl = ""
  let googleReviewUrl = ""
  let googleReviewsCache: any = null
  if (data.contractor_id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, widget_color, logo_url, google_review_url, google_reviews_cache")
      .eq("id", data.contractor_id)
      .single()
    if (profile) {
      contractorName = profile.username
      brandColor = profile.widget_color || brandColor
      logoUrl = profile.logo_url || ""
      googleReviewUrl = profile.google_review_url || ""
      googleReviewsCache = profile.google_reviews_cache || null
    }
  }

  return NextResponse.json({ ...data, contractor_name: contractorName, brand_color: brandColor, brand_logo_url: logoUrl, google_review_url: googleReviewUrl, google_reviews_cache: googleReviewsCache })
}
