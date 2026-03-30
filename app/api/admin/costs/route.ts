import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

const PLAN_PRICES: Record<string, number> = { monthly: 99, annual: 79 }
const TEAM_MEMBER_PRICE = 39

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = getServiceSupabase()

    // Fetch all platform costs
    const { data: costs, error: costsError } = await supabase
      .from("platform_costs")
      .select("*")
      .order("created_at", { ascending: false })

    if (costsError) {
      console.error("Error fetching costs:", costsError)
      return NextResponse.json({ error: "Failed to fetch costs" }, { status: 500 })
    }

    // Calculate unit economics
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("plan_type, user_id")
      .eq("status", "active")

    const activeSubs = subscriptions || []
    const totalActiveSubs = activeSubs.length

    // Get team member counts for all active subscribers
    const subscriberIds = activeSubs.map((s) => s.user_id)
    let totalTeamMembers = 0
    if (subscriberIds.length > 0) {
      const { count } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .in("account_id", subscriberIds)
        .eq("status", "active")
      totalTeamMembers = count || 0
    }

    // Calculate MRR
    let mrr = 0
    for (const sub of activeSubs) {
      const planPrice = PLAN_PRICES[sub.plan_type] || PLAN_PRICES.monthly
      mrr += planPrice
    }
    mrr += totalTeamMembers * TEAM_MEMBER_PRICE

    const totalMonthlyCost = (costs || []).reduce(
      (sum: number, c: { monthly_cost: number }) => sum + (c.monthly_cost || 0),
      0
    )
    const grossMargin = mrr - totalMonthlyCost
    const marginPercent = mrr > 0 ? Math.round((grossMargin / mrr) * 10000) / 100 : 0
    const costPerContractor =
      totalActiveSubs > 0 ? Math.round((totalMonthlyCost / totalActiveSubs) * 100) / 100 : 0
    const avgRevenuePerContractor = totalActiveSubs > 0 ? mrr / totalActiveSubs : 0
    const breakEvenContractors =
      avgRevenuePerContractor > 0
        ? Math.ceil(totalMonthlyCost / avgRevenuePerContractor)
        : 0

    return NextResponse.json({
      costs: costs || [],
      economics: {
        totalMonthlyCost,
        mrr,
        grossMargin,
        marginPercent,
        costPerContractor,
        breakEvenContractors,
      },
    })
  } catch (err) {
    console.error("Admin costs GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = getServiceSupabase()
    const body = await req.json()
    const { id, name, monthly_cost, category, notes } = body

    if (!name || monthly_cost === undefined) {
      return NextResponse.json(
        { error: "name and monthly_cost are required" },
        { status: 400 }
      )
    }

    if (id) {
      // Update existing cost
      const { data, error } = await supabase
        .from("platform_costs")
        .update({ name, monthly_cost, category, notes })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("Error updating cost:", error)
        return NextResponse.json({ error: "Failed to update cost" }, { status: 500 })
      }
      return NextResponse.json({ cost: data })
    } else {
      // Create new cost
      const { data, error } = await supabase
        .from("platform_costs")
        .insert({ name, monthly_cost, category, notes })
        .select()
        .single()

      if (error) {
        console.error("Error creating cost:", error)
        return NextResponse.json({ error: "Failed to create cost" }, { status: 500 })
      }
      return NextResponse.json({ cost: data })
    }
  } catch (err) {
    console.error("Admin costs POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    const { error } = await supabase.from("platform_costs").delete().eq("id", id)

    if (error) {
      console.error("Error deleting cost:", error)
      return NextResponse.json({ error: "Failed to delete cost" }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error("Admin costs DELETE error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
