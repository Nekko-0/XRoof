import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  try {
    const [settingsRes, campaignsRes] = await Promise.all([
      supabase.from("winback_settings").select("*").single(),
      supabase
        .from("winback_campaigns")
        .select("*, profiles:user_id(id, full_name, email, company_name)")
        .order("created_at", { ascending: false }),
    ])

    if (settingsRes.error && settingsRes.error.code !== "PGRST116") {
      console.error("Error fetching winback_settings:", settingsRes.error)
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }

    if (campaignsRes.error) {
      console.error("Error fetching winback_campaigns:", campaignsRes.error)
      return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 })
    }

    const campaigns = campaignsRes.data || []
    const sent = campaigns.length
    const converted = campaigns.filter((c) => c.converted === true).length

    return NextResponse.json({
      settings: settingsRes.data || null,
      campaigns,
      stats: { sent, converted },
    })
  } catch (err) {
    console.error("Winback GET error:", err)
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
    const { enabled, days_after_cancel, discount_percent, subject, body: emailBody } = body

    const { data, error } = await supabase
      .from("winback_settings")
      .upsert(
        {
          id: 1,
          enabled,
          days_after_cancel,
          discount_percent,
          subject,
          body: emailBody,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select()
      .single()

    if (error) {
      console.error("Error upserting winback_settings:", error)
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("Winback POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
