import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("measurement_requests")
    .select("*")
    .eq("contractor_id", userId)
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    console.error("[XRoof] measurement-requests GET error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const body = await req.json()
  const { address, roof_type, urgency, notes, report_type } = body

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 })
  }

  const insertData: any = {
    contractor_id: userId,
    address,
    roof_type: roof_type || "Residential",
    urgency: urgency || "standard",
    notes: notes || "",
    status: "requested",
  }
  if (report_type) insertData.report_type = report_type

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("measurement_requests")
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error("[XRoof] measurement-requests POST error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getServiceSupabase()
  const { data: mr } = await supabase.from("measurement_requests").select("contractor_id").eq("id", id).single()
  if (!mr || mr.contractor_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("measurement_requests")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[XRoof] measurement-requests PATCH error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getServiceSupabase()
  const { data: mr } = await supabase.from("measurement_requests").select("contractor_id").eq("id", id).single()
  if (!mr || mr.contractor_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { error } = await supabase.from("measurement_requests").delete().eq("id", id)
  if (error) {
    console.error("[XRoof] measurement-requests DELETE error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
