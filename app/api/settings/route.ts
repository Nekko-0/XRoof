import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("profiles")
    .select("licensed_insured_certified, licensed_insured_certified_at")
    .eq("id", userId)
    .single()

  if (error || !data) {
    return NextResponse.json({ licensed_insured_certified: false })
  }
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const body = await req.json()
  const supabase = getServiceSupabase()

  const updates: Record<string, unknown> = {}

  if (body.licensed_insured_certified === true) {
    updates.licensed_insured_certified = true
    updates.licensed_insured_certified_at = new Date().toISOString()
  } else if (body.licensed_insured_certified === false) {
    updates.licensed_insured_certified = false
    updates.licensed_insured_certified_at = null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)

  if (error) {
    console.error("[XRoof] settings PATCH error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
