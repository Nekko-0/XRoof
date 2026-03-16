import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

const PLAN_PRICES: Record<string, number> = { monthly: 199, annual: 169 }
const TEAM_MEMBER_PRICE = 39

export async function GET(req: Request) {
  // Server-side admin auth — only NEXT_PUBLIC_ADMIN_EMAIL can access
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  // Parallel queries for performance
  const [
    { data: subscriptions },
    { data: profiles },
    { data: teamMembers },
    { data: reportPurchases },
    { count: totalJobs },
    { count: totalInvoices },
    { count: totalInvoicesPaid },
    { count: totalReports },
  ] = await Promise.all([
    supabase.from("subscriptions").select("*"),
    supabase.from("profiles").select("id, username, company_name, email, phone, created_at").eq("role", "Contractor"),
    supabase.from("team_members").select("account_id, invited_email, invited_name, role, status, created_at"),
    supabase.from("report_purchases").select("user_id, amount, created_at"),
    supabase.from("jobs").select("*", { count: "exact", head: true }),
    supabase.from("invoices").select("*", { count: "exact", head: true }),
    supabase.from("invoices").select("*", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("reports").select("*", { count: "exact", head: true }),
  ])

  const subs = subscriptions || []
  const allProfiles = profiles || []
  const allTeam = teamMembers || []
  const allPurchases = reportPurchases || []

  // Build profile map
  const profileMap = new Map(allProfiles.map(p => [p.id, p]))

  // Team count per account
  const teamCountMap = new Map<string, number>()
  for (const tm of allTeam) {
    if (tm.status === "active") {
      teamCountMap.set(tm.account_id, (teamCountMap.get(tm.account_id) || 0) + 1)
    }
  }

  // --- MRR calculation ---
  const activeSubs = subs.filter(s => s.status === "active")
  const trialingSubs = subs.filter(s => s.status === "trialing")
  const canceledSubs = subs.filter(s => s.status === "canceled")
  const pastDueSubs = subs.filter(s => s.status === "past_due")

  let mrr = 0
  for (const s of activeSubs) {
    const planPrice = PLAN_PRICES[s.plan] || PLAN_PRICES.monthly
    const teamCount = teamCountMap.get(s.user_id) || 0
    mrr += planPrice + teamCount * TEAM_MEMBER_PRICE
  }

  // --- Subscribers list ---
  const subscribers = subs.map(s => {
    const profile = profileMap.get(s.user_id)
    const teamCount = teamCountMap.get(s.user_id) || 0
    const planPrice = PLAN_PRICES[s.plan] || PLAN_PRICES.monthly
    const mrrContribution = s.status === "active" ? planPrice + teamCount * TEAM_MEMBER_PRICE : 0
    return {
      user_id: s.user_id,
      username: profile?.username || "",
      company_name: profile?.company_name || "",
      email: profile?.email || "",
      plan: s.plan,
      status: s.status,
      stripe_customer_id: s.stripe_customer_id,
      current_period_end: s.current_period_end,
      team_member_count: teamCount,
      mrr_contribution: mrrContribution,
    }
  })

  // --- Trials with days remaining ---
  const now = new Date()
  const trials = trialingSubs.map(s => {
    const profile = profileMap.get(s.user_id)
    const trialEnds = new Date(s.current_period_end)
    const daysRemaining = Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    return {
      user_id: s.user_id,
      username: profile?.username || "",
      company_name: profile?.company_name || "",
      email: profile?.email || "",
      plan: s.plan,
      trial_ends: s.current_period_end,
      days_remaining: daysRemaining,
      expiring_soon: daysRemaining <= 2,
    }
  })

  // --- Churn ---
  const churned = canceledSubs.map(s => {
    const profile = profileMap.get(s.user_id)
    const start = new Date(s.current_period_start)
    const end = new Date(s.current_period_end)
    const daysSubscribed = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return {
      user_id: s.user_id,
      username: profile?.username || "",
      company_name: profile?.company_name || "",
      plan: s.plan,
      canceled_date: s.current_period_end,
      was_subscribed_days: daysSubscribed,
    }
  })

  // Churn rate: canceled this month / (active at start of month)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const canceledThisMonth = canceledSubs.filter(s => new Date(s.current_period_end) >= monthStart).length
  const totalActiveStart = activeSubs.length + canceledThisMonth
  const churnRate = totalActiveStart > 0 ? Math.round((canceledThisMonth / totalActiveStart) * 100 * 10) / 10 : 0

  // --- Past due ---
  const pastDue = pastDueSubs.map(s => {
    const profile = profileMap.get(s.user_id)
    const periodEnd = new Date(s.current_period_end)
    const daysPastDue = Math.max(0, Math.ceil((now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24)))
    return {
      user_id: s.user_id,
      username: profile?.username || "",
      company_name: profile?.company_name || "",
      email: profile?.email || "",
      plan: s.plan,
      stripe_customer_id: s.stripe_customer_id,
      days_past_due: daysPastDue,
    }
  })

  // --- Engagement scoring ---
  // Get last job + last invoice per contractor
  const { data: lastJobs } = await supabase
    .from("jobs")
    .select("contractor_id, created_at")
    .order("created_at", { ascending: false })

  const { data: lastInvoices } = await supabase
    .from("invoices")
    .select("contractor_id, created_at")
    .order("created_at", { ascending: false })

  const lastJobMap = new Map<string, string>()
  for (const j of lastJobs || []) {
    if (j.contractor_id && !lastJobMap.has(j.contractor_id)) {
      lastJobMap.set(j.contractor_id, j.created_at)
    }
  }
  const lastInvoiceMap = new Map<string, string>()
  for (const inv of lastInvoices || []) {
    if (inv.contractor_id && !lastInvoiceMap.has(inv.contractor_id)) {
      lastInvoiceMap.set(inv.contractor_id, inv.created_at)
    }
  }

  const engagement = allProfiles.map(p => {
    const lastJob = lastJobMap.get(p.id)
    const lastInv = lastInvoiceMap.get(p.id)
    const latestActivity = [lastJob, lastInv].filter(Boolean).sort().reverse()[0]
    let score: "active" | "idle" | "dormant" = "dormant"
    if (latestActivity) {
      const daysSince = Math.ceil((now.getTime() - new Date(latestActivity).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince <= 7) score = "active"
      else if (daysSince <= 14) score = "idle"
    }
    return {
      user_id: p.id,
      username: p.username || "",
      company_name: p.company_name || "",
      last_job_created: lastJob || null,
      last_invoice_sent: lastInv || null,
      score,
    }
  })

  // --- Revenue by month (12 months) ---
  // Estimate subscription revenue per month by counting active subs
  const monthlyRevenue: { month: string; subscriptions: number; reports: number; total: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString("en-US", { month: "short" })
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`

    // Report purchases in this month
    const reportRev = allPurchases
      .filter(p => p.created_at?.slice(0, 7) === monthKey)
      .reduce((sum, p) => sum + (p.amount || 0), 0) / 100

    // Subscription revenue: count subs active during this month × plan price
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const subRev = subs.filter(s => {
      if (s.status === "canceled") {
        return new Date(s.current_period_end) >= d
      }
      return new Date(s.current_period_start) <= monthEnd
    }).reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || PLAN_PRICES.monthly), 0)

    monthlyRevenue.push({ month: label, subscriptions: subRev, reports: reportRev, total: subRev + reportRev })
  }

  // --- Onboarding funnel ---
  const contractorIds = new Set(allProfiles.map(p => p.id))
  const { data: contractorsWithJobs } = await supabase
    .from("jobs")
    .select("contractor_id")
    .in("contractor_id", Array.from(contractorIds))

  const { data: contractorsWithInvoices } = await supabase
    .from("invoices")
    .select("contractor_id")
    .in("contractor_id", Array.from(contractorIds))

  const { data: contractorsWithPaidInvoices } = await supabase
    .from("invoices")
    .select("contractor_id")
    .eq("status", "paid")
    .in("contractor_id", Array.from(contractorIds))

  const onboardingFunnel = {
    signed_up: allProfiles.length,
    created_job: new Set((contractorsWithJobs || []).map(j => j.contractor_id)).size,
    sent_invoice: new Set((contractorsWithInvoices || []).map(i => i.contractor_id)).size,
    got_paid: new Set((contractorsWithPaidInvoices || []).map(i => i.contractor_id)).size,
  }

  // --- Total lifetime revenue ---
  const totalReportRevenue = allPurchases.reduce((sum, p) => sum + (p.amount || 0), 0) / 100
  const totalLifetimeRevenue = monthlyRevenue.reduce((sum, m) => sum + m.total, 0)

  // --- Projected annual revenue ---
  const trialConversionRate = 0.6
  const projectedTrialMRR = trialingSubs.length * trialConversionRate * (PLAN_PRICES.monthly)
  const projectedAnnualRevenue = (mrr + projectedTrialMRR) * 12

  // --- Recent activity (last 20 events) ---
  const activity: { type: string; description: string; timestamp: string }[] = []

  // Recent signups
  for (const p of allProfiles.slice(0, 10)) {
    activity.push({ type: "signup", description: `${p.company_name || p.username || "Unknown"} signed up`, timestamp: p.created_at })
  }
  // Recent report purchases
  for (const rp of allPurchases.slice(0, 10)) {
    const profile = profileMap.get(rp.user_id)
    activity.push({ type: "purchase", description: `${profile?.company_name || "Unknown"} purchased a report ($${(rp.amount / 100).toFixed(0)})`, timestamp: rp.created_at })
  }
  // Recent team members
  for (const tm of allTeam.slice(0, 10)) {
    const profile = profileMap.get(tm.account_id)
    activity.push({ type: "team", description: `${profile?.company_name || "Unknown"} added team member ${tm.invited_name || tm.invited_email}`, timestamp: tm.created_at })
  }
  // Subscription events
  for (const s of canceledSubs.slice(0, 5)) {
    const profile = profileMap.get(s.user_id)
    activity.push({ type: "churn", description: `${profile?.company_name || "Unknown"} canceled (${s.plan})`, timestamp: s.current_period_end })
  }

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json({
    mrr,
    activeSubscribers: activeSubs.length,
    trialingCount: trialingSubs.length,
    totalLifetimeRevenue,
    projectedAnnualRevenue: Math.round(projectedAnnualRevenue),
    churnRate,
    totalContractors: allProfiles.length,
    subscribers,
    trials,
    churned,
    pastDue,
    engagement,
    recentActivity: activity.slice(0, 20),
    monthlyRevenue,
    onboardingFunnel,
    platformStats: {
      totalJobs: totalJobs || 0,
      totalInvoices: totalInvoices || 0,
      totalInvoicesPaid: totalInvoicesPaid || 0,
      totalReports: totalReports || 0,
    },
  })
}
