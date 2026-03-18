import { NextResponse } from "next/server"
import { requireAuth, isAdmin, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const user = await requireAuth(req)
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const supabase = getServiceSupabase()

    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan, status, current_period_start, current_period_end, created_at, canceled_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[XRoof] stripe-revenue GET error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }

    const all = subs || []
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Active subs
    const active = all.filter((s) => s.status === "active")
    const monthlyActive = active.filter((s) => s.plan === "monthly")
    const annualActive = active.filter((s) => s.plan === "annual")
    const trialing = all.filter((s) => s.status === "trialing")

    // MRR calculation
    const MONTHLY_PRICE = 99
    const ANNUAL_MONTHLY = 79
    const mrr = (monthlyActive.length * MONTHLY_PRICE) + (annualActive.length * ANNUAL_MONTHLY)

    // Churn (canceled in last 30 days)
    const recentCancels = all.filter((s) => s.canceled_at && new Date(s.canceled_at) >= thirtyDaysAgo)
    const activeStartOfMonth = active.length + recentCancels.length
    const churnRate = activeStartOfMonth > 0 ? Math.round((recentCancels.length / activeStartOfMonth) * 100) : 0

    // Trial conversion
    const everTrialed = all.filter((s) => s.created_at) // all subs started as trial
    const converted = all.filter((s) => s.status === "active" || s.status === "past_due")
    const trialConversion = everTrialed.length > 0 ? Math.round((converted.length / everTrialed.length) * 100) : 0

    // Avg subscription duration (months) for LTV
    const durations = active.map((s) => {
      const start = new Date(s.created_at)
      return (now.getTime() - start.getTime()) / (30 * 24 * 60 * 60 * 1000)
    })
    const avgDurationMonths = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
    const avgMonthlyRevenue = active.length > 0 ? mrr / active.length : MONTHLY_PRICE
    const ltv = Math.round(avgDurationMonths * avgMonthlyRevenue)

    // MRR trend (last 6 months)
    const mrrTrend: { month: string; mrr: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const label = d.toLocaleDateString("en-US", { month: "short" })

      const activeAtDate = all.filter((s) => {
        const created = new Date(s.created_at)
        if (created > monthEnd) return false
        if (s.canceled_at && new Date(s.canceled_at) < d) return false
        return s.status === "active" || s.status === "trialing" || s.status === "past_due" ||
          (s.canceled_at && new Date(s.canceled_at) >= d)
      })
      const monthlyCount = activeAtDate.filter((s) => s.plan === "monthly").length
      const annualCount = activeAtDate.filter((s) => s.plan === "annual").length
      mrrTrend.push({ month: label, mrr: (monthlyCount * MONTHLY_PRICE) + (annualCount * ANNUAL_MONTHLY) })
    }

    return NextResponse.json({
      mrr,
      totalActive: active.length,
      totalTrialing: trialing.length,
      monthlyCount: monthlyActive.length,
      annualCount: annualActive.length,
      churnRate,
      trialConversion,
      ltv,
      mrrTrend,
      recentCancels: recentCancels.length,
    })
  } catch (err) {
    console.error("[XRoof] stripe-revenue error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
