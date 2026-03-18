import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from("profiles")
      .select("material_preferences")
      .eq("id", auth.userId)
      .single()

    if (error) {
      console.error("[XRoof] material-preferences GET error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
    return NextResponse.json(data?.material_preferences || {})
  } catch (err) {
    console.error("[XRoof] material preferences GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { hidden_brands } = body

    if (!Array.isArray(hidden_brands)) {
      return NextResponse.json({ error: "hidden_brands must be an array" }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    const { error } = await supabase
      .from("profiles")
      .update({ material_preferences: { hidden_brands } })
      .eq("id", auth.userId)

    if (error) {
      console.error("[XRoof] material-preferences PUT error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
    return NextResponse.json({ updated: true })
  } catch (err) {
    console.error("[XRoof] material preferences PUT error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
