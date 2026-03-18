import { NextResponse } from "next/server"
import { requireAuth, isAdmin, getServiceSupabase } from "@/lib/api-auth"

const PLAN_PRICES: Record<string, number> = {
  monthly: 99,
  annual: 79,
}
const TEAM_MEMBER_PRICE = 39

interface Factor {
  name: string
  score: number
  max: 20
  status: "good" | "warning" | "critical"
}

function statusFromScore(score: number): "good" | "warning" | "critical" {
  if (score >= 15) return "good"
  if (score >= 10) return "warning"
  return "critical"
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const supabase = getServiceSupabase()
    const now = new Date()
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString()
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    // Fetch all subscriptions
    const { data: allSubs } = await supabase
      .from("subscriptions")
      .select("id, user_id, status, plan, created_at, canceled_at, updated_at")

    const subs = allSubs || []

    const activeSubs = subs.filter((s) => s.status === "active")
    const activeNow = activeSubs.length

    // --- Growth rate (20pts) ---
    // Active subs 30 days ago: active now + canceled in last 30d - created in last 30d
    const canceledLast30 = subs.filter(
      (s) =>
        s.status === "canceled" &&
        s.canceled_at &&
        s.canceled_at >= thirtyDaysAgo
    ).length
    const createdLast30Active = activeSubs.filter(
      (s) => s.created_at >= thirtyDaysAgo
    ).length
    const active30dAgo = activeNow + canceledLast30 - createdLast30Active
    const growthRate =
      active30dAgo > 0
        ? ((activeNow - active30dAgo) / active30dAgo) * 100
        : activeNow > 0
          ? 100
          : 0

    let growthScore: number
    if (growthRate > 5) growthScore = 20
    else if (growthRate > 2) growthScore = 15
    else if (growthRate > 0) growthScore = 10
    else growthScore = 0

    // --- Churn rate (20pts) ---
    const churnRate =
      activeNow > 0 ? (canceledLast30 / (activeNow + canceledLast30)) * 100 : 0

    let churnScore: number
    if (churnRate < 2) churnScore = 20
    else if (churnRate < 5) churnScore = 15
    else if (churnRate < 10) churnScore = 10
    else churnScore = 0

    // --- NRR (20pts) ---
    // Calculate MRR now
    const getMrr = (subList: typeof subs) => {
      let mrr = 0
      for (const s of subList) {
        mrr += PLAN_PRICES[s.plan] || 99
      }
      return mrr
    }

    const currentMrr = getMrr(activeSubs)

    // Get team members for additional MRR
    const { count: teamCount } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")

    const teamMrr = (teamCount || 0) * TEAM_MEMBER_PRICE
    const totalCurrentMrr = currentMrr + teamMrr

    // MRR 30 days ago (approximate)
    const mrr30dAgo =
      active30dAgo > 0 ? (active30dAgo / (activeNow || 1)) * totalCurrentMrr : 0

    const nrr = mrr30dAgo > 0 ? (totalCurrentMrr / mrr30dAgo) * 100 : 100

    let nrrScore: number
    if (nrr > 110) nrrScore = 20
    else if (nrr > 100) nrrScore = 15
    else if (nrr > 90) nrrScore = 10
    else nrrScore = 0

    // --- Engagement (20pts) ---
    const { data: activeContractorJobs } = await supabase
      .from("jobs")
      .select("contractor_id")
      .gte("created_at", sevenDaysAgo)

    const uniqueActiveContractors = new Set(
      (activeContractorJobs || []).map((j) => j.contractor_id)
    ).size

    const engagementRate =
      activeNow > 0 ? (uniqueActiveContractors / activeNow) * 100 : 0

    let engagementScore: number
    if (engagementRate > 80) engagementScore = 20
    else if (engagementRate > 60) engagementScore = 15
    else if (engagementRate > 40) engagementScore = 10
    else engagementScore = 0

    // --- Trial conversion (20pts) ---
    const trialsEndedLast30 = subs.filter(
      (s) =>
        s.status !== "trialing" &&
        s.created_at < thirtyDaysAgo &&
        subs.some(
          (orig) => orig.user_id === s.user_id && orig.status !== "trialing"
        )
    )

    // Count trialing -> active conversions in last 30 days
    const { count: convertedCount } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gte("updated_at", thirtyDaysAgo)

    const { count: totalTrialsEnded } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .neq("status", "trialing")
      .gte("created_at", thirtyDaysAgo)

    const trialConversionRate =
      (totalTrialsEnded || 0) > 0
        ? ((convertedCount || 0) / (totalTrialsEnded || 1)) * 100
        : 0

    let trialScore: number
    if (trialConversionRate > 50) trialScore = 20
    else if (trialConversionRate > 30) trialScore = 15
    else if (trialConversionRate > 15) trialScore = 10
    else trialScore = 0

    // --- Composite ---
    const factors: Factor[] = [
      {
        name: "Growth Rate",
        score: growthScore,
        max: 20,
        status: statusFromScore(growthScore),
      },
      {
        name: "Churn Rate",
        score: churnScore,
        max: 20,
        status: statusFromScore(churnScore),
      },
      {
        name: "Net Revenue Retention",
        score: nrrScore,
        max: 20,
        status: statusFromScore(nrrScore),
      },
      {
        name: "Engagement",
        score: engagementScore,
        max: 20,
        status: statusFromScore(engagementScore),
      },
      {
        name: "Trial Conversion",
        score: trialScore,
        max: 20,
        status: statusFromScore(trialScore),
      },
    ]

    const totalScore = factors.reduce((sum, f) => sum + f.score, 0)

    return NextResponse.json({ score: totalScore, factors })
  } catch (err) {
    console.error("Health score GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
