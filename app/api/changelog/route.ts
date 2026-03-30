import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServiceSupabase()

  const [entriesResult, readsResult] = await Promise.all([
    supabase
      .from("changelog_entries")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("changelog_reads")
      .select("last_read_at")
      .eq("user_id", auth.userId)
      .single(),
  ])

  if (entriesResult.error) {
    console.error("Error fetching changelog entries:", entriesResult.error)
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 })
  }

  const entries = entriesResult.data || []
  const lastReadAt = readsResult.data?.last_read_at
    ? new Date(readsResult.data.last_read_at)
    : new Date(0)

  const unreadCount = entries.filter(
    (e) => new Date(e.created_at) > lastReadAt
  ).length

  return NextResponse.json({ entries, unreadCount })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServiceSupabase()

  const { error } = await supabase
    .from("changelog_reads")
    .upsert(
      { user_id: auth.userId, last_read_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )

  if (error) {
    console.error("Error marking changelog as read:", error)
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
