import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from("changelog_entries")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching changelog entries:", error)
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 })
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
    title: string
    description: string
    category: string
    published: boolean
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.title || !body.description) {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 })
  }

  const record = {
    title: body.title,
    description: body.description,
    category: body.category || "improvement",
    published: body.published ?? false,
  }

  if (body.id) {
    const { data, error } = await supabase
      .from("changelog_entries")
      .update(record)
      .eq("id", body.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating changelog entry:", error)
      return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    }
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from("changelog_entries")
    .insert(record)
    .select()
    .single()

  if (error) {
    console.error("Error creating changelog entry:", error)
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
    .from("changelog_entries")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting changelog entry:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
