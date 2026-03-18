import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

// GET: fetch note for a contractor
// POST: upsert note for a contractor
// Table: admin_notes (contractor_id text PK, note text, updated_at timestamptz)

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contractorId = searchParams.get("contractor_id")
  if (!contractorId) return NextResponse.json({ error: "Missing contractor_id" }, { status: 400 })

  const supabase = getServiceSupabase()
  const { data } = await supabase.from("admin_notes").select("note, updated_at").eq("contractor_id", contractorId).maybeSingle()
  return NextResponse.json({ note: data?.note || "", updated_at: data?.updated_at || null })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { contractor_id, note } = body
  if (!contractor_id) return NextResponse.json({ error: "Missing contractor_id" }, { status: 400 })

  const supabase = getServiceSupabase()
  const { error } = await supabase.from("admin_notes").upsert({
    contractor_id,
    note: note || "",
    updated_at: new Date().toISOString(),
  }, { onConflict: "contractor_id" })

  if (error) {
    console.error("[XRoof] admin-notes POST error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
