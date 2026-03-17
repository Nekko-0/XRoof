import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  try {
    const { data, error } = await supabase
      .from("admin_settings")
      .select("*")

    if (error) {
      console.error("Error fetching admin_settings:", error)
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }

    const settings: Record<string, unknown> = {}
    for (const row of data || []) {
      settings[row.key] = row.value
    }

    return NextResponse.json(settings)
  } catch (err) {
    console.error("Admin settings GET error:", err)
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
    const { key, value } = body

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("admin_settings")
      .upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      )
      .select()
      .single()

    if (error) {
      console.error("Error upserting admin_setting:", error)
      return NextResponse.json({ error: "Failed to update setting" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("Admin settings POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
