import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"
import { LandingPageCreateSchema, LandingPageUpdateSchema, validateBody } from "@/lib/validations"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("contractor_id", userId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const body = await req.json()
  const v = validateBody(LandingPageCreateSchema, body)
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 })
  const { title, subtitle, cta_text, hero_image_url, template, utm_source, utm_campaign } = v.data!

  // Generate slug from title
  const baseSlug = (title || "page")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  const slug = `${baseSlug}-${Date.now().toString(36)}`

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("landing_pages")
    .insert({
      contractor_id: userId,
      slug,
      title: title || "Get Your Free Roof Estimate",
      subtitle: subtitle || "Professional roofing services you can trust.",
      cta_text: cta_text || "Get Free Estimate",
      hero_image_url: hero_image_url || null,
      template: template || "standard",
      utm_source: utm_source || null,
      utm_campaign: utm_campaign || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const body = await req.json()
  const v = validateBody(LandingPageUpdateSchema, body)
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 })
  const { id, ...updates } = v.data!

  const supabase = getServiceSupabase()
  // Verify ownership
  const { data: page } = await supabase.from("landing_pages").select("contractor_id").eq("id", id).single()
  if (!page || page.contractor_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("landing_pages")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getServiceSupabase()
  const { data: page } = await supabase.from("landing_pages").select("contractor_id").eq("id", id).single()
  if (!page || page.contractor_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await supabase.from("landing_pages").delete().eq("id", id)
  return NextResponse.json({ success: true })
}
