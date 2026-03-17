import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

// GET: fetch active announcement (public for contractor dashboard)
// POST: set/update announcement (admin only)
// Table: platform_announcements (id uuid PK default gen, message text, type text, active bool, created_at timestamptz)

export async function GET() {
  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from("platform_announcements")
    .select("id, message, type")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ announcement: data || null })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { message, type, active } = body
  const supabase = getServiceSupabase()

  if (active === false) {
    // Deactivate all
    await supabase.from("platform_announcements").update({ active: false }).eq("active", true)
    return NextResponse.json({ success: true })
  }

  // Deactivate old, insert new
  await supabase.from("platform_announcements").update({ active: false }).eq("active", true)
  const { error } = await supabase.from("platform_announcements").insert({
    message: message || "",
    type: type || "info",
    active: true,
    created_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
