import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("job_id")

    if (!jobId) {
      return NextResponse.json({ error: "Missing job_id" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Verify job ownership
    const { data: job } = await supabase.from("jobs").select("contractor_id").eq("id", jobId).single()
    if (!job || job.contractor_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("material_selections")
      .select("*, material_catalog(brand, product_line, color)")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[XRoof] material selections GET error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
    return NextResponse.json(data || [])
  } catch (err) {
    console.error("[XRoof] material selections GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  try {
    const body = await req.json()
    const { job_id, catalog_item_id, notes } = body

    if (!job_id || !catalog_item_id) {
      return NextResponse.json({ error: "Missing job_id or catalog_item_id" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Verify job ownership
    const { data: job } = await supabase.from("jobs").select("contractor_id").eq("id", job_id).single()
    if (!job || job.contractor_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const { data, error } = await supabase
      .from("material_selections")
      .insert({
        job_id,
        catalog_item_id,
        selected_by: "contractor",
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error("[XRoof] material selections POST error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error("[XRoof] material selections POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
