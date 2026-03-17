import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

const PLAN_PRICES: Record<string, number> = { monthly: 199, annual: 169 }
const TEAM_MEMBER_PRICE = 39

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = getServiceSupabase()
    const now = new Date()

    // Current month boundaries
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // ---- Active subscriptions ----
    const { data: activeSubs } = await supabase
      .from("subscriptions")
      .select("plan_type, user_id, created_at")
      .eq("status", "active")

    const activeSubsList = activeSubs || []
    const totalActiveSubs = activeSubsList.length

    // ---- Trials ----
    const { count: trialsCount } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "trialing")

    // ---- Total contractors ----
    const { count: totalContractors } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "Contractor")

    // ---- Team members for MRR ----
    const subscriberIds = activeSubsList.map((s) => s.user_id)
    let totalTeamMembers = 0
    if (subscriberIds.length > 0) {
      const { count } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .in("account_id", subscriberIds)
        .eq("status", "active")
      totalTeamMembers = count || 0
    }

    // ---- Current MRR ----
    let currentMRR = 0
    for (const sub of activeSubsList) {
      currentMRR += PLAN_PRICES[sub.plan_type] || PLAN_PRICES.monthly
    }
    currentMRR += totalTeamMembers * TEAM_MEMBER_PRICE

    // ---- Last month MRR (approximate from subs that were active before this month) ----
    const { data: lastMonthSubs } = await supabase
      .from("subscriptions")
      .select("plan_type, user_id")
      .eq("status", "active")
      .lte("created_at", lastMonthEnd.toISOString())

    let lastMonthMRR = 0
    const lastMonthSubsList = lastMonthSubs || []
    let lastMonthTeamMembers = 0
    if (lastMonthSubsList.length > 0) {
      const lastMonthSubIds = lastMonthSubsList.map((s) => s.user_id)
      const { count } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .in("account_id", lastMonthSubIds)
        .eq("status", "active")
      lastMonthTeamMembers = count || 0
    }
    for (const sub of lastMonthSubsList) {
      lastMonthMRR += PLAN_PRICES[sub.plan_type] || PLAN_PRICES.monthly
    }
    lastMonthMRR += lastMonthTeamMembers * TEAM_MEMBER_PRICE

    // ---- MRR Growth Rate ----
    const mrrGrowthRate =
      lastMonthMRR > 0
        ? Math.round(((currentMRR - lastMonthMRR) / lastMonthMRR) * 10000) / 100
        : 0

    // ---- Churn Rate ----
    const { count: canceledThisMonth } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "canceled")
      .gte("updated_at", currentMonthStart.toISOString())

    const totalAtStartOfMonth = lastMonthSubsList.length || 1
    const churnRate =
      Math.round(((canceledThisMonth || 0) / totalAtStartOfMonth) * 10000) / 100

    // ---- Average LTV ----
    // LTV = ARPU / churn rate (monthly)
    const arpu = totalActiveSubs > 0 ? currentMRR / totalActiveSubs : 0
    const monthlyChurnDecimal = churnRate / 100
    const averageLTV =
      monthlyChurnDecimal > 0
        ? Math.round(arpu / monthlyChurnDecimal)
        : arpu * 24 // fallback: assume 24-month lifetime

    // ---- Net Revenue Retention (NRR) ----
    // NRR = (current MRR from cohort that existed last month) / last month MRR
    const nrr =
      lastMonthMRR > 0
        ? Math.round((currentMRR / lastMonthMRR) * 10000) / 100
        : 100

    // ---- Monthly revenue last 12 months ----
    const monthlyRevenue: { month: string; mrr: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const mLabel = mDate.toLocaleString("en-US", { month: "short", year: "numeric" })

      const { data: mSubs } = await supabase
        .from("subscriptions")
        .select("plan_type")
        .eq("status", "active")
        .lte("created_at", mEnd.toISOString())

      let mMRR = 0
      for (const sub of mSubs || []) {
        mMRR += PLAN_PRICES[sub.plan_type] || PLAN_PRICES.monthly
      }
      monthlyRevenue.push({ month: mLabel, mrr: mMRR })
    }

    // ---- Runway estimate ----
    const { data: costs } = await supabase
      .from("platform_costs")
      .select("monthly_cost")

    const totalMonthlyCost = (costs || []).reduce(
      (sum: number, c: { monthly_cost: number }) => sum + (c.monthly_cost || 0),
      0
    )
    const netMonthly = currentMRR - totalMonthlyCost
    const runwayMonths = totalMonthlyCost > 0 && netMonthly !== 0
      ? netMonthly > 0
        ? "Profitable"
        : `${Math.abs(Math.round(currentMRR / totalMonthlyCost * 10) / 10)} months at current burn`
      : "N/A"

    return NextResponse.json({
      generatedAt: now.toISOString(),
      mrr: currentMRR,
      mrrGrowthRate,
      churnRate,
      averageLTV,
      nrr,
      totalContractors: totalContractors || 0,
      activeSubscriptions: totalActiveSubs,
      trials: trialsCount || 0,
      teamMembers: totalTeamMembers,
      arpu: Math.round(arpu * 100) / 100,
      totalMonthlyCost,
      runway: runwayMonths,
      monthlyRevenue,
    })
  } catch (err) {
    console.error("Investor report error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
