import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("followup_templates")
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
  const { name, trigger, steps } = body

  if (!name || !steps) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("followup_templates")
    .insert({
      contractor_id: userId,
      name,
      trigger: trigger || "estimate_sent",
      steps,
      active: true,
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
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getServiceSupabase()
  // Verify ownership
  const { data: tmpl } = await supabase.from("followup_templates").select("contractor_id").eq("id", id).single()
  if (!tmpl || tmpl.contractor_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("followup_templates")
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
  // Verify ownership
  const { data: tmpl } = await supabase.from("followup_templates").select("contractor_id").eq("id", id).single()
  if (!tmpl || tmpl.contractor_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { error } = await supabase.from("followup_templates").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
