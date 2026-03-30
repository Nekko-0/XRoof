import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  try {
    const { data, error } = await supabase
      .from("cancellation_reasons")
      .select("*, profiles:user_id(id, full_name, email, company_name)")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching cancellation_reasons:", error)
      return NextResponse.json({ error: "Failed to fetch cancellation reasons" }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error("Cancellation reasons GET error:", err)
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
    const { user_id, reason, details } = body

    if (!user_id || !reason) {
      return NextResponse.json({ error: "user_id and reason are required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("cancellation_reasons")
      .upsert(
        {
          user_id,
          reason,
          details: details || null,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single()

    if (error) {
      console.error("Error upserting cancellation_reason:", error)
      return NextResponse.json({ error: "Failed to save cancellation reason" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("Cancellation reasons POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
