import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get("slug")

  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 })

  const { data: page, error } = await supabase
    .from("landing_pages")
    .select("id, contractor_id, title, subtitle, cta_text, hero_image_url, template, utm_source, utm_campaign")
    .eq("slug", slug)
    .eq("active", true)
    .single()

  if (error || !page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 })
  }

  // Fetch contractor branding
  const { data: branding } = await supabase
    .from("profiles")
    .select("company_name, logo_url, widget_color, phone, email, service_zips, widget_price_per_sqft, google_review_url")
    .eq("id", page.contractor_id)
    .single()

  return NextResponse.json({ page, branding: branding || {} })
}
