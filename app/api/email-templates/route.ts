import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("email_templates")
    .select("id, contractor_id, template_type, subject, body_html, created_at")
    .eq("contractor_id", userId)
    .order("template_type", { ascending: true })
    .limit(500)

  if (error) {
    console.error("[XRoof] email-templates GET error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { template_type, subject, body_html } = await req.json()
  if (!template_type || !subject) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("email_templates")
    .insert({ contractor_id: userId, template_type, subject, body_html: body_html || "" })
    .select()
    .single()

  if (error) {
    console.error("[XRoof] email-templates POST error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PUT(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { id, subject, body_html } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getServiceSupabase()
  // Verify ownership
  const { data: tmpl } = await supabase.from("email_templates").select("contractor_id").eq("id", id).single()
  if (!tmpl || tmpl.contractor_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("email_templates")
    .update({ subject, body_html })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[XRoof] email-templates PUT error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getServiceSupabase()
  // Verify ownership
  const { data: tmpl } = await supabase.from("email_templates").select("contractor_id").eq("id", id).single()
  if (!tmpl || tmpl.contractor_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { error } = await supabase.from("email_templates").delete().eq("id", id)
  if (error) {
    console.error("[XRoof] email-templates DELETE error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
