import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from("jobs")
      .select("id, customer_name, address, status, scheduled_date")
      .eq("contractor_id", auth.userId)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err) {
    console.error("[XRoof] jobs GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
