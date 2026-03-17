import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  try {
    const { data, error } = await supabase
      .from("revenue_goals")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching revenue_goals:", error)
      return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error("Goals GET error:", err)
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
    const { period, target_amount, start_date, end_date } = body

    if (!period || !target_amount || !start_date || !end_date) {
      return NextResponse.json(
        { error: "period, target_amount, start_date, and end_date are required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("revenue_goals")
      .insert({
        period,
        target_amount,
        start_date,
        end_date,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating revenue_goal:", error)
      return NextResponse.json({ error: "Failed to create goal" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("Goals POST error:", err)
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
      .from("revenue_goals")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting revenue_goal:", error)
      return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Goals DELETE error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
