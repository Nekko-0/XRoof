import { NextResponse } from "next/server"
import { requireAuth, isAdmin, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from("trial_nudge_templates")
      .select("*")
      .order("day", { ascending: true })

    if (error) {
      console.error("Error fetching trial nudge templates:", error)
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error("Trial nudges GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id, subject, body_html, enabled } = await req.json()

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      )
    }

    const supabase = getServiceSupabase()

    const updates: Record<string, unknown> = {}
    if (subject !== undefined) updates.subject = subject
    if (body_html !== undefined) updates.body_html = body_html
    if (enabled !== undefined) updates.enabled = enabled
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("trial_nudge_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating trial nudge template:", error)
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("Trial nudges PUT error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
