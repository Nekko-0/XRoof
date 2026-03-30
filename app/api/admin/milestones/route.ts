import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  const [defResult, eventsResult] = await Promise.all([
    supabase
      .from("milestone_definitions")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("milestone_events")
      .select("*, profiles:user_id(id, full_name, email, company_name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  if (defResult.error) {
    console.error("Error fetching milestone definitions:", defResult.error)
    return NextResponse.json({ error: "Failed to fetch definitions" }, { status: 500 })
  }
  if (eventsResult.error) {
    console.error("Error fetching milestone events:", eventsResult.error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }

  return NextResponse.json({
    definitions: defResult.data,
    events: eventsResult.data,
  })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  let body: {
    id?: string
    name: string
    description: string
    threshold: number
    metric: string
    email_subject: string
    email_body: string
    enabled: boolean
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.name || !body.metric) {
    return NextResponse.json({ error: "name and metric are required" }, { status: 400 })
  }

  const record = {
    name: body.name,
    description: body.description || "",
    threshold: body.threshold ?? 0,
    metric: body.metric,
    email_subject: body.email_subject || "",
    email_body: body.email_body || "",
    enabled: body.enabled ?? true,
  }

  if (body.id) {
    const { data, error } = await supabase
      .from("milestone_definitions")
      .update(record)
      .eq("id", body.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating milestone definition:", error)
      return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    }
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from("milestone_definitions")
    .insert(record)
    .select()
    .single()

  if (error) {
    console.error("Error creating milestone definition:", error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
