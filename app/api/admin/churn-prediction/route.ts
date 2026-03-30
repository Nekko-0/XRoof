import { NextResponse } from "next/server"
import { requireAuth, isAdmin, getServiceSupabase } from "@/lib/api-auth"
import { calculateChurnScore } from "@/lib/churn-score"

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from("churn_scores")
      .select("*, profiles:user_id(company_name, username, email)")
      .order("score", { ascending: false })

    if (error) {
      console.error("Error fetching churn scores:", error)
      return NextResponse.json(
        { error: "Failed to fetch churn scores" },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error("Churn prediction GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const supabase = getServiceSupabase()

    // Get all active contractor profiles
    const { data: contractors, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "Contractor")

    if (profilesError) {
      console.error("Error fetching contractors:", profilesError)
      return NextResponse.json(
        { error: "Failed to fetch contractors" },
        { status: 500 }
      )
    }

    let count = 0

    for (const contractor of contractors || []) {
      const result = await calculateChurnScore(supabase, contractor.id)

      const { error: upsertError } = await supabase
        .from("churn_scores")
        .upsert(
          {
            user_id: result.user_id,
            score: result.score,
            risk_level: result.risk_level,
            factors: result.factors,
            calculated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

      if (upsertError) {
        console.error(
          `Error upserting churn score for ${contractor.id}:`,
          upsertError
        )
        continue
      }

      count++
    }

    return NextResponse.json({ recalculated: count })
  } catch (err) {
    console.error("Churn prediction POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
