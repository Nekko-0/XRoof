import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  try {
    const [settingsRes, responsesRes] = await Promise.all([
      supabase.from("nps_settings").select("*").single(),
      supabase
        .from("nps_responses")
        .select("*, profiles:user_id(id, full_name, email, company_name)")
        .order("created_at", { ascending: false }),
    ])

    if (settingsRes.error && settingsRes.error.code !== "PGRST116") {
      console.error("Error fetching nps_settings:", settingsRes.error)
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }

    if (responsesRes.error) {
      console.error("Error fetching nps_responses:", responsesRes.error)
      return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 })
    }

    const responses = responsesRes.data || []
    const total = responses.length

    let promoters = 0
    let passives = 0
    let detractors = 0

    for (const r of responses) {
      const score = r.score
      if (score >= 9) promoters++
      else if (score >= 7) passives++
      else detractors++
    }

    const npsScore = total > 0
      ? Math.round(((promoters - detractors) / total) * 100)
      : 0

    return NextResponse.json({
      settings: settingsRes.data || null,
      responses,
      npsScore,
      promoters,
      passives,
      detractors,
    })
  } catch (err) {
    console.error("NPS GET error:", err)
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
    const { enabled, frequency_days, subject } = body

    const { data, error } = await supabase
      .from("nps_settings")
      .upsert(
        {
          id: 1,
          enabled,
          frequency_days,
          subject,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select()
      .single()

    if (error) {
      console.error("Error upserting nps_settings:", error)
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("NPS POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
