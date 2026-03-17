import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  try {
    const [settingsRes, sequencesRes] = await Promise.all([
      supabase.from("dunning_settings").select("*").single(),
      supabase
        .from("dunning_sequences")
        .select("*, profiles:user_id(id, full_name, email, company_name)")
        .order("created_at", { ascending: false }),
    ])

    if (settingsRes.error && settingsRes.error.code !== "PGRST116") {
      console.error("Error fetching dunning_settings:", settingsRes.error)
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }

    if (sequencesRes.error) {
      console.error("Error fetching dunning_sequences:", sequencesRes.error)
      return NextResponse.json({ error: "Failed to fetch sequences" }, { status: 500 })
    }

    const sequences = sequencesRes.data || []
    const recovered = sequences.filter((s) => s.recovered === true)
    const totalSent = sequences.length
    const recoveredCount = recovered.length
    const recoveredAmount = recoveredCount * 199

    return NextResponse.json({
      settings: settingsRes.data || null,
      sequences,
      stats: { totalSent, recovered: recoveredCount, recoveredAmount },
    })
  } catch (err) {
    console.error("Dunning GET error:", err)
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
    const {
      enabled,
      day1_subject,
      day1_body,
      day3_subject,
      day3_body,
      day7_subject,
      day7_body,
    } = body

    const { data, error } = await supabase
      .from("dunning_settings")
      .upsert(
        {
          id: 1,
          enabled,
          day1_subject,
          day1_body,
          day3_subject,
          day3_body,
          day7_subject,
          day7_body,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select()
      .single()

    if (error) {
      console.error("Error upserting dunning_settings:", error)
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("Dunning POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
