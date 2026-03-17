import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching competitors:", error)
    return NextResponse.json({ error: "Failed to fetch competitors" }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  let body: {
    id?: string
    name: string
    pricing: string
    strengths: string
    weaknesses: string
    notes: string
    website: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const record = {
    name: body.name,
    pricing: body.pricing || "",
    strengths: body.strengths || "",
    weaknesses: body.weaknesses || "",
    notes: body.notes || "",
    website: body.website || "",
  }

  if (body.id) {
    const { data, error } = await supabase
      .from("competitors")
      .update(record)
      .eq("id", body.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating competitor:", error)
      return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    }
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from("competitors")
    .insert(record)
    .select()
    .single()

  if (error) {
    console.error("Error creating competitor:", error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("competitors")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting competitor:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
