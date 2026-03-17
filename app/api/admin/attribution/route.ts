import { NextResponse } from "next/server"
import { requireAuth, isAdmin, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const supabase = getServiceSupabase()

    // Get all contractors with their attribution source and active subscription
    const { data: contractors, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, company_name, attribution_source, created_at"
      )
      .eq("role", "Contractor")

    if (error) {
      console.error("Error fetching contractors:", error)
      return NextResponse.json(
        { error: "Failed to fetch contractors" },
        { status: 500 }
      )
    }

    // Get active subscriptions for MRR calculation
    const { data: subscriptions, error: subsError } = await supabase
      .from("subscriptions")
      .select("user_id, plan, status")
      .eq("status", "active")

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError)
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      )
    }

    const PLAN_PRICES: Record<string, number> = {
      monthly: 199,
      annual: 169,
    }

    // Build a map of user_id -> MRR
    const mrrByUser = new Map<string, number>()
    for (const sub of subscriptions || []) {
      const price = PLAN_PRICES[sub.plan] || 199
      mrrByUser.set(sub.user_id, price)
    }

    // Group by attribution source
    const sourceMap = new Map<
      string,
      { count: number; mrr: number }
    >()

    const contractorList = (contractors || []).map((c) => {
      const source = c.attribution_source || "unknown"
      const mrr = mrrByUser.get(c.id) || 0

      const existing = sourceMap.get(source) || { count: 0, mrr: 0 }
      existing.count++
      existing.mrr += mrr
      sourceMap.set(source, existing)

      return {
        id: c.id,
        full_name: c.full_name,
        email: c.email,
        company_name: c.company_name,
        attribution_source: source,
        mrr,
        created_at: c.created_at,
      }
    })

    const sources = Array.from(sourceMap.entries()).map(
      ([source, stats]) => ({
        source,
        contractors: stats.count,
        mrr: stats.mrr,
      })
    )

    return NextResponse.json({ sources, contractors: contractorList })
  } catch (err) {
    console.error("Attribution GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { user_id, source } = await req.json()

    if (!user_id || !source) {
      return NextResponse.json(
        { error: "user_id and source are required" },
        { status: 400 }
      )
    }

    const supabase = getServiceSupabase()

    const { error } = await supabase
      .from("profiles")
      .update({ attribution_source: source })
      .eq("id", user_id)

    if (error) {
      console.error("Error updating attribution source:", error)
      return NextResponse.json(
        { error: "Failed to update attribution source" },
        { status: 500 }
      )
    }

    return NextResponse.json({ updated: true })
  } catch (err) {
    console.error("Attribution PATCH error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
