import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  try {
    const [rulesRes, historyRes] = await Promise.all([
      supabase
        .from("alert_rules")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("alert_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ])

    if (rulesRes.error) {
      console.error("Error fetching alert_rules:", rulesRes.error)
      return NextResponse.json({ error: "Failed to fetch alert rules" }, { status: 500 })
    }

    if (historyRes.error) {
      console.error("Error fetching alert_history:", historyRes.error)
      return NextResponse.json({ error: "Failed to fetch alert history" }, { status: 500 })
    }

    return NextResponse.json({
      rules: rulesRes.data || [],
      history: historyRes.data || [],
    })
  } catch (err) {
    console.error("Alerts GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  try {
    const body = await req.json()
    const { id, name, trigger_type, condition, notify_method, enabled } = body

    if (!name || !trigger_type || !condition || !notify_method) {
      return NextResponse.json(
        { error: "name, trigger_type, condition, and notify_method are required" },
        { status: 400 }
      )
    }

    const row = {
      name,
      trigger_type,
      condition,
      notify_method,
      enabled: enabled ?? true,
      updated_at: new Date().toISOString(),
    }

    let data, error

    if (id) {
      const res = await supabase
        .from("alert_rules")
        .update(row)
        .eq("id", id)
        .select()
        .single()
      data = res.data
      error = res.error
    } else {
      const res = await supabase
        .from("alert_rules")
        .insert({ ...row, created_at: new Date().toISOString() })
        .select()
        .single()
      data = res.data
      error = res.error
    }

    if (error) {
      console.error("Error saving alert_rule:", error)
      return NextResponse.json({ error: "Failed to save alert rule" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("Alerts POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("alert_rules")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting alert_rule:", error)
      return NextResponse.json({ error: "Failed to delete alert rule" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Alerts DELETE error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
