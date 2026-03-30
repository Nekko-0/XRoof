import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

const PLAN_PRICES: Record<string, number> = { monthly: 99, annual: 79 }
const TEAM_MEMBER_PRICE = 39

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const now = new Date()

  // ── Parallel batch 1: core tables ──
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
    supabase.from("profiles").select("id, username, company_name, email, phone, service_zips, created_at").eq("role", "Contractor"),
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
  const profileMap = new Map(allProfiles.map(p => [p.id, p]))
  const contractorIds = new Set(allProfiles.map(p => p.id))

  // Team count per account
  const teamCountMap = new Map<string, number>()
  for (const tm of allTeam) {
    if (tm.status === "active") {
      teamCountMap.set(tm.account_id, (teamCountMap.get(tm.account_id) || 0) + 1)
    }
  }

  // ── Parallel batch 2: new stats tables ──
  const [
    { count: contractsSent },
    { count: contractsSigned },
    { count: estimatesViewed },
    { count: automationsSent },
    { count: portalMessagesCount },
    { count: smsCount },
    { count: photosCount },
    { data: landingPages },
    { data: paidInvoices },
    { data: allJobs },
    { data: allInvoicesRaw },
    { data: allReportsRaw },
    { data: allContracts },
    { data: allAutomations },
    { data: allAppointments },
  ] = await Promise.all([
    supabase.from("contracts").select("*", { count: "exact", head: true }),
    supabase.from("contracts").select("*", { count: "exact", head: true }).eq("status", "signed"),
    supabase.from("document_events").select("*", { count: "exact", head: true }).eq("event_type", "estimate_viewed"),
    supabase.from("scheduled_automations").select("*", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("portal_messages").select("*", { count: "exact", head: true }),
    supabase.from("sms_messages").select("*", { count: "exact", head: true }),
    supabase.from("job_photos").select("*", { count: "exact", head: true }),
    supabase.from("landing_pages").select("views, conversions"),
    supabase.from("invoices").select("amount, contractor_id").eq("status", "paid"),
    supabase.from("jobs").select("contractor_id, status, created_at"),
    supabase.from("invoices").select("contractor_id, created_at"),
    supabase.from("reports").select("contractor_id, created_at"),
    supabase.from("contracts").select("contractor_id"),
    supabase.from("scheduled_automations").select("contractor_id"),
    supabase.from("appointments").select("contractor_id"),
  ])

  // ── Landing page totals ──
  const landingPageViews = (landingPages || []).reduce((sum, lp) => sum + (lp.views || 0), 0)
  const landingPageConversions = (landingPages || []).reduce((sum, lp) => sum + (lp.conversions || 0), 0)

  // ── Payment volume ──
  const paymentVolume = (paidInvoices || []).reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0) / 100

  // ── Time saved estimate ──
  const timeSavedMinutes = (totalReports || 0) * 30 + (automationsSent || 0) * 5 + (contractsSigned || 0) * 20
  const timeSavedHours = Math.round(timeSavedMinutes / 60 * 10) / 10

  // ── MRR ──
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

  // ── NRR (Net Revenue Retention) ──
  // Simplified: current MRR (including expansion from team members) vs base MRR without expansion
  const baseMrr = activeSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || PLAN_PRICES.monthly), 0)
  const expansionRevenue = activeSubs.reduce((sum, s) => sum + (teamCountMap.get(s.user_id) || 0) * TEAM_MEMBER_PRICE, 0)
  const churnedMrr = canceledSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || PLAN_PRICES.monthly), 0)
  const nrr = baseMrr > 0 ? Math.round(((baseMrr + expansionRevenue) / (baseMrr + churnedMrr)) * 100) : 100

  // ── Subscribers list ──
  const subscribers = subs.map(s => {
    const profile = profileMap.get(s.user_id)
    const teamCount = teamCountMap.get(s.user_id) || 0
    const planPrice = PLAN_PRICES[s.plan] || PLAN_PRICES.monthly
    const mrrContribution = s.status === "active" ? planPrice + teamCount * TEAM_MEMBER_PRICE : 0
    // LTV: months subscribed × plan price + team revenue
    const startDate = new Date(s.current_period_start)
    const endDate = s.status === "canceled" ? new Date(s.current_period_end) : now
    const monthsSubscribed = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    const ltv = monthsSubscribed * planPrice + monthsSubscribed * teamCount * TEAM_MEMBER_PRICE
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
      ltv,
    }
  })

  // Average LTV
  const averageLtv = subscribers.length > 0 ? Math.round(subscribers.reduce((sum, s) => sum + s.ltv, 0) / subscribers.length) : 0

  // ── Trials with days remaining ──
  const trials = trialingSubs.map(s => {
    const profile = profileMap.get(s.user_id)
    const trialEnds = new Date(s.current_period_end)
    const daysRemaining = Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    return {
      user_id: s.user_id, username: profile?.username || "",
      company_name: profile?.company_name || "", email: profile?.email || "",
      plan: s.plan, trial_ends: s.current_period_end,
      days_remaining: daysRemaining, expiring_soon: daysRemaining <= 2,
    }
  })

  // ── Churn ──
  const churned = canceledSubs.map(s => {
    const profile = profileMap.get(s.user_id)
    const start = new Date(s.current_period_start)
    const end = new Date(s.current_period_end)
    const daysSubscribed = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return {
      user_id: s.user_id, username: profile?.username || "",
      company_name: profile?.company_name || "", plan: s.plan,
      canceled_date: s.current_period_end, was_subscribed_days: daysSubscribed,
    }
  })

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const canceledThisMonth = canceledSubs.filter(s => new Date(s.current_period_end) >= monthStart).length
  const totalActiveStart = activeSubs.length + canceledThisMonth
  const churnRate = totalActiveStart > 0 ? Math.round((canceledThisMonth / totalActiveStart) * 100 * 10) / 10 : 0

  // ── Past due ──
  const pastDue = pastDueSubs.map(s => {
    const profile = profileMap.get(s.user_id)
    const periodEnd = new Date(s.current_period_end)
    const daysPastDue = Math.max(0, Math.ceil((now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24)))
    return {
      user_id: s.user_id, username: profile?.username || "",
      company_name: profile?.company_name || "", email: profile?.email || "",
      plan: s.plan, stripe_customer_id: s.stripe_customer_id, days_past_due: daysPastDue,
    }
  })

  // ── Health scores + engagement ──
  const jobsByContractor = new Map<string, { total: number; recent: number; lastCreated: string }>()
  for (const j of allJobs || []) {
    if (!j.contractor_id) continue
    const entry = jobsByContractor.get(j.contractor_id) || { total: 0, recent: 0, lastCreated: "" }
    entry.total++
    if (j.created_at > entry.lastCreated) entry.lastCreated = j.created_at
    const daysAgo = (now.getTime() - new Date(j.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysAgo <= 30) entry.recent++
    jobsByContractor.set(j.contractor_id, entry)
  }

  const invoicesByContractor = new Map<string, { total: number; lastCreated: string }>()
  for (const inv of allInvoicesRaw || []) {
    if (!inv.contractor_id) continue
    const entry = invoicesByContractor.get(inv.contractor_id) || { total: 0, lastCreated: "" }
    entry.total++
    if (inv.created_at > entry.lastCreated) entry.lastCreated = inv.created_at
    invoicesByContractor.set(inv.contractor_id, entry)
  }

  const reportsByContractor = new Map<string, number>()
  for (const r of allReportsRaw || []) {
    if (r.contractor_id) reportsByContractor.set(r.contractor_id, (reportsByContractor.get(r.contractor_id) || 0) + 1)
  }

  const paidByContractor = new Map<string, number>()
  for (const inv of paidInvoices || []) {
    if (inv.contractor_id) paidByContractor.set(inv.contractor_id, (paidByContractor.get(inv.contractor_id) || 0) + 1)
  }

  const engagement = allProfiles.map(p => {
    const jobs = jobsByContractor.get(p.id)
    const invs = invoicesByContractor.get(p.id)
    const lastJob = jobs?.lastCreated || null
    const lastInv = invs?.lastCreated || null
    const latestActivity = [lastJob, lastInv].filter(Boolean).sort().reverse()[0]
    let engScore: "active" | "idle" | "dormant" = "dormant"
    if (latestActivity) {
      const daysSince = Math.ceil((now.getTime() - new Date(latestActivity).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince <= 7) engScore = "active"
      else if (daysSince <= 14) engScore = "idle"
    }

    // Health score: recency (30%) + jobs last 30d (25%) + invoices sent (20%) + payment status (25%)
    const sub = subs.find(s => s.user_id === p.id)
    let healthScore = 0
    // Recency
    if (latestActivity) {
      const daysSince = (now.getTime() - new Date(latestActivity).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince <= 3) healthScore += 30
      else if (daysSince <= 7) healthScore += 22
      else if (daysSince <= 14) healthScore += 12
      else healthScore += 3
    }
    // Jobs last 30d
    const recentJobs = jobs?.recent || 0
    healthScore += Math.min(25, recentJobs * 8)
    // Invoices sent
    const invCount = invs?.total || 0
    healthScore += Math.min(20, invCount * 5)
    // Payment status
    if (sub?.status === "active") healthScore += 25
    else if (sub?.status === "trialing") healthScore += 18
    else if (sub?.status === "past_due") healthScore += 5

    const healthLevel = healthScore >= 60 ? "healthy" : healthScore >= 30 ? "at_risk" : "needs_attention"

    return {
      user_id: p.id, username: p.username || "", company_name: p.company_name || "",
      last_job_created: lastJob, last_invoice_sent: lastInv,
      score: engScore, healthScore, healthLevel,
    }
  })

  // ── Top contractors ──
  const topContractors = allProfiles.map(p => ({
    user_id: p.id,
    username: p.username || "",
    company_name: p.company_name || "",
    jobs_completed: (allJobs || []).filter(j => j.contractor_id === p.id && j.status === "Completed").length,
    invoices_paid: paidByContractor.get(p.id) || 0,
    reports_made: reportsByContractor.get(p.id) || 0,
  })).sort((a, b) => (b.jobs_completed + b.invoices_paid + b.reports_made) - (a.jobs_completed + a.invoices_paid + a.reports_made)).slice(0, 5)

  // ── Feature adoption ──
  const contractorsWithContracts = new Set((allContracts || []).map(c => c.contractor_id).filter(Boolean))
  const contractorsWithAutomations = new Set((allAutomations || []).map(a => a.contractor_id).filter(Boolean))
  const contractorsWithAppointments = new Set((allAppointments || []).map(a => a.contractor_id).filter(Boolean))
  const contractorsWithTeam = new Set(allTeam.map(t => t.account_id))
  const contractorsWithInvoicesSet = new Set((allInvoicesRaw || []).map(i => i.contractor_id).filter(Boolean))

  const total = allProfiles.length
  const featureAdoption = {
    contracts: { used: contractorsWithContracts.size, total },
    invoices: { used: contractorsWithInvoicesSet.size, total },
    automations: { used: contractorsWithAutomations.size, total },
    calendar: { used: contractorsWithAppointments.size, total },
    team: { used: contractorsWithTeam.size, total },
    reports: { used: new Set((allReportsRaw || []).map(r => r.contractor_id).filter(Boolean)).size, total },
  }

  // ── Geographic distribution ──
  const zipToState: Record<string, string> = {
    "0": "CT/MA/ME/NH/NJ/PR/RI/VT", "1": "DE/NY/PA", "2": "DC/MD/NC/SC/VA/WV",
    "3": "AL/FL/GA/MS/TN", "4": "IN/KY/MI/OH", "5": "IA/MN/MT/ND/SD/WI",
    "6": "IL/KS/MO/NE", "7": "AR/LA/OK/TX", "8": "AZ/CO/ID/NM/NV/UT/WY", "9": "AK/CA/HI/OR/WA",
  }
  const geoMap = new Map<string, { zips: Set<string>; contractors: Set<string> }>()
  for (const p of allProfiles) {
    for (const zip of p.service_zips || []) {
      const firstDigit = zip?.[0]
      if (!firstDigit || !zipToState[firstDigit]) continue
      const region = zipToState[firstDigit]
      const entry = geoMap.get(region) || { zips: new Set(), contractors: new Set() }
      entry.zips.add(zip)
      entry.contractors.add(p.id)
      geoMap.set(region, entry)
    }
  }
  const geoDistribution = Array.from(geoMap.entries())
    .map(([region, data]) => ({ region, zipCount: data.zips.size, contractorCount: data.contractors.size }))
    .sort((a, b) => b.contractorCount - a.contractorCount)

  // ── Cohort retention ──
  const cohorts: { month: string; signups: number; retention: number[] }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    const cohortProfiles = allProfiles.filter(p => {
      const created = new Date(p.created_at)
      return created >= d && created < nextMonth
    })
    if (cohortProfiles.length === 0) continue
    const cohortIds = cohortProfiles.map(p => p.id)
    const retention: number[] = []
    const monthsSince = Math.ceil((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30))
    for (let m = 0; m < monthsSince && m < 6; m++) {
      // Check how many from this cohort still have active/trialing sub
      const retained = cohortIds.filter(id => {
        const sub = subs.find(s => s.user_id === id)
        if (!sub) return false
        if (sub.status === "active" || sub.status === "trialing") return true
        if (sub.status === "canceled") {
          const cancelDate = new Date(sub.current_period_end)
          const checkDate = new Date(d.getFullYear(), d.getMonth() + m + 1, 1)
          return cancelDate >= checkDate
        }
        return false
      }).length
      retention.push(Math.round((retained / cohortProfiles.length) * 100))
    }
    cohorts.push({ month: label, signups: cohortProfiles.length, retention })
  }

  // ── Monthly revenue (12 months) ──
  const monthlyRevenue: { month: string; subscriptions: number; reports: number; total: number; cumulative: number }[] = []
  let cumulative = 0
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString("en-US", { month: "short" })
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const reportRev = allPurchases.filter(p => p.created_at?.slice(0, 7) === monthKey).reduce((sum, p) => sum + (p.amount || 0), 0) / 100
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const subRev = subs.filter(s => {
      if (s.status === "canceled") return new Date(s.current_period_end) >= d
      return new Date(s.current_period_start) <= monthEnd
    }).reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || PLAN_PRICES.monthly), 0)
    cumulative += subRev + reportRev
    monthlyRevenue.push({ month: label, subscriptions: subRev, reports: reportRev, total: subRev + reportRev, cumulative })
  }

  // ── Trends (current vs previous month) ──
  const currentMonthRev = monthlyRevenue[monthlyRevenue.length - 1]?.total || 0
  const prevMonthRev = monthlyRevenue[monthlyRevenue.length - 2]?.total || 0
  const trends = {
    mrr: prevMonthRev > 0 ? Math.round(((currentMonthRev - prevMonthRev) / prevMonthRev) * 100) : 0,
    subscribers: 0,
    revenue: prevMonthRev > 0 ? Math.round(((currentMonthRev - prevMonthRev) / prevMonthRev) * 100) : 0,
  }

  // ── Onboarding funnel ──
  const onboardingFunnel = {
    signed_up: allProfiles.length,
    created_job: new Set((allJobs || []).map(j => j.contractor_id).filter(Boolean)).size,
    sent_invoice: new Set((allInvoicesRaw || []).map(i => i.contractor_id).filter(Boolean)).size,
    got_paid: new Set((paidInvoices || []).map(i => i.contractor_id).filter(Boolean)).size,
  }

  // ── Lifetime revenue ──
  const totalLifetimeRevenue = monthlyRevenue.reduce((sum, m) => sum + m.total, 0)
  const trialConversionRate = 0.6
  const projectedAnnualRevenue = Math.round((mrr + trialingSubs.length * trialConversionRate * PLAN_PRICES.monthly) * 12)

  // ── Recent activity ──
  const activity: { type: string; description: string; timestamp: string }[] = []
  for (const p of allProfiles.slice(0, 10)) {
    activity.push({ type: "signup", description: `${p.company_name || p.username || "Unknown"} signed up`, timestamp: p.created_at })
  }
  for (const rp of allPurchases.slice(0, 10)) {
    const profile = profileMap.get(rp.user_id)
    activity.push({ type: "purchase", description: `${profile?.company_name || "Unknown"} purchased a report ($${(rp.amount / 100).toFixed(0)})`, timestamp: rp.created_at })
  }
  for (const tm of allTeam.slice(0, 10)) {
    const profile = profileMap.get(tm.account_id)
    activity.push({ type: "team", description: `${profile?.company_name || "Unknown"} added team member ${tm.invited_name || tm.invited_email}`, timestamp: tm.created_at })
  }
  for (const s of canceledSubs.slice(0, 5)) {
    const profile = profileMap.get(s.user_id)
    activity.push({ type: "churn", description: `${profile?.company_name || "Unknown"} canceled (${s.plan})`, timestamp: s.current_period_end })
  }
  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // ── #7 Onboarding progress per contractor ──
  const onboardingPerUser = allProfiles.map(p => {
    const hasJob = (allJobs || []).some(j => j.contractor_id === p.id)
    const hasInvoice = (allInvoicesRaw || []).some(i => i.contractor_id === p.id)
    const hasPaidInvoice = (paidInvoices || []).some(i => i.contractor_id === p.id)
    const hasContract = (allContracts || []).some(c => c.contractor_id === p.id)
    const hasReport = (allReportsRaw || []).some(r => r.contractor_id === p.id)
    const hasTeam = allTeam.some(t => t.account_id === p.id && t.status === "active")
    const steps = [
      { label: "Profile", done: !!(p.company_name && p.phone) },
      { label: "First Job", done: hasJob },
      { label: "First Invoice", done: hasInvoice },
      { label: "First Payment", done: hasPaidInvoice },
      { label: "First Contract", done: hasContract },
      { label: "First Report", done: hasReport },
      { label: "Team Member", done: hasTeam },
    ]
    const pct = Math.round((steps.filter(s => s.done).length / steps.length) * 100)
    const daysSinceSignup = Math.ceil((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
    return { user_id: p.id, username: p.username || "", company_name: p.company_name || "", steps, pct, daysSinceSignup }
  })

  // ── #9 Seasonal revenue forecast ──
  const seasonalForecast = monthlyRevenue.map((m, i) => {
    const avgGrowthRate = monthlyRevenue.length > 1
      ? monthlyRevenue.slice(1).reduce((sum, cur, idx) => {
          const prev = monthlyRevenue[idx].total
          return sum + (prev > 0 ? (cur.total - prev) / prev : 0)
        }, 0) / (monthlyRevenue.length - 1)
      : 0
    return { ...m, forecast: i === monthlyRevenue.length - 1 ? Math.round(m.total * (1 + avgGrowthRate)) : undefined }
  })
  // Project next 3 months
  const lastRevenue = monthlyRevenue[monthlyRevenue.length - 1]?.total || 0
  const avgGrowth = monthlyRevenue.length > 2
    ? (monthlyRevenue[monthlyRevenue.length - 1].total - monthlyRevenue[0].total) / (monthlyRevenue.length - 1)
    : 0
  const forecastMonths: { month: string; forecast: number }[] = []
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    forecastMonths.push({ month: d.toLocaleDateString("en-US", { month: "short" }), forecast: Math.max(0, Math.round(lastRevenue + avgGrowth * i)) })
  }

  // ── #10 Pricing experiment data ──
  const pricingExperiment = {
    monthly: {
      total: subs.filter(s => s.plan === "monthly").length,
      active: subs.filter(s => s.plan === "monthly" && s.status === "active").length,
      trialing: subs.filter(s => s.plan === "monthly" && s.status === "trialing").length,
      canceled: subs.filter(s => s.plan === "monthly" && s.status === "canceled").length,
      conversionRate: (() => {
        const t = subs.filter(s => s.plan === "monthly" && (s.status === "canceled" || s.status === "active")).length
        const a = subs.filter(s => s.plan === "monthly" && s.status === "active").length
        return t > 0 ? Math.round((a / t) * 100) : 0
      })(),
      arpu: 99,
    },
    annual: {
      total: subs.filter(s => s.plan === "annual").length,
      active: subs.filter(s => s.plan === "annual" && s.status === "active").length,
      trialing: subs.filter(s => s.plan === "annual" && s.status === "trialing").length,
      canceled: subs.filter(s => s.plan === "annual" && s.status === "canceled").length,
      conversionRate: (() => {
        const t = subs.filter(s => s.plan === "annual" && (s.status === "canceled" || s.status === "active")).length
        const a = subs.filter(s => s.plan === "annual" && s.status === "active").length
        return t > 0 ? Math.round((a / t) * 100) : 0
      })(),
      arpu: 79,
    },
  }

  // ── #13 Revenue breakdown by source ──
  const teamRevenue = activeSubs.reduce((sum, s) => sum + (teamCountMap.get(s.user_id) || 0) * TEAM_MEMBER_PRICE, 0)
  const monthlySubRev = activeSubs.filter(s => s.plan === "monthly").length * 99
  const annualSubRev = activeSubs.filter(s => s.plan === "annual").length * 79
  const reportRevenue = allPurchases.reduce((sum, p) => sum + (p.amount || 0), 0) / 100
  const revenueBreakdown = {
    monthlySubscriptions: monthlySubRev,
    annualSubscriptions: annualSubRev,
    teamAddons: teamRevenue,
    reportPurchases: Math.round(reportRevenue),
  }

  // ── #18 Trial conversion day-by-day ──
  const trialActivity: { day: number; active: number; createdJob: number; sentInvoice: number; converted: number }[] = []
  for (let day = 0; day <= 7; day++) {
    const dayProfiles = allProfiles.filter(p => {
      const daysSince = Math.ceil((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
      return daysSince >= day
    })
    const activeOnDay = dayProfiles.filter(p => {
      const sub = subs.find(s => s.user_id === p.id)
      return sub && (sub.status === "active" || sub.status === "trialing")
    }).length
    const jobOnDay = dayProfiles.filter(p => {
      const firstJob = (allJobs || []).find(j => j.contractor_id === p.id)
      if (!firstJob) return false
      const jobDay = Math.ceil((new Date(firstJob.created_at).getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
      return jobDay <= day
    }).length
    const invOnDay = dayProfiles.filter(p => {
      const firstInv = (allInvoicesRaw || []).find(i => i.contractor_id === p.id)
      if (!firstInv) return false
      const invDay = Math.ceil((new Date(firstInv.created_at).getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
      return invDay <= day
    }).length
    trialActivity.push({ day, active: activeOnDay, createdJob: jobOnDay, sentInvoice: invOnDay, converted: activeSubs.filter(s => {
      const profile = profileMap.get(s.user_id)
      if (!profile) return false
      const daysSince = Math.ceil((new Date(s.current_period_start).getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
      return daysSince <= day
    }).length })
  }

  // ── Fetch extra data for dashboard features ──
  const [
    { data: revenueGoals },
    { data: npsResponses },
    { data: cancellationReasons },
    { data: dunningSeqs },
    { data: alertHistoryItems },
  ] = await Promise.all([
    supabase.from("revenue_goals").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("nps_responses").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("cancellation_reasons").select("*").order("created_at", { ascending: false }),
    supabase.from("dunning_sequences").select("*"),
    supabase.from("alert_history").select("*").order("triggered_at", { ascending: false }).limit(10),
  ])

  // NPS score
  const npsAll = npsResponses || []
  const npsPromoters = npsAll.filter(r => r.score >= 9).length
  const npsDetractors = npsAll.filter(r => r.score <= 6).length
  const npsScore = npsAll.length > 0 ? Math.round(((npsPromoters - npsDetractors) / npsAll.length) * 100) : null

  // Revenue goal progress
  const currentGoal = (revenueGoals || [])[0] || null

  // Dunning stats
  const dunningAll = dunningSeqs || []
  const dunningRecovered = dunningAll.filter(d => d.recovered).length
  const dunningRecoveredAmount = dunningRecovered * 99

  // Cancellation reason distribution
  const reasonCounts: Record<string, number> = {}
  for (const cr of cancellationReasons || []) {
    reasonCounts[cr.reason] = (reasonCounts[cr.reason] || 0) + 1
  }

  // ── System health (cron jobs) ──
  const cronJobs = [
    { name: "followups", schedule: "6:00 AM", path: "/api/cron/followups" },
    { name: "lead-followup", schedule: "6:05 AM", path: "/api/cron/lead-followup" },
    { name: "stale-leads", schedule: "6:10 AM", path: "/api/cron/stale-leads" },
    { name: "automations", schedule: "7:00 AM", path: "/api/cron/automations" },
    { name: "payment-reminders", schedule: "7:05 AM", path: "/api/cron/payment-reminders" },
    { name: "invoice-overdue", schedule: "7:10 AM", path: "/api/cron/invoice-overdue" },
    { name: "appointment-reminders", schedule: "8:00 AM", path: "/api/cron/appointment-reminders" },
  ]
  // Check last automation sent as proxy for cron health
  const { data: lastAutomation } = await supabase
    .from("scheduled_automations")
    .select("sent_at")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastCronActivity = lastAutomation?.sent_at || null
  const systemHealth = cronJobs.map(cron => {
    // If we have recent automation activity, assume crons are running
    const status = lastCronActivity && (now.getTime() - new Date(lastCronActivity).getTime()) < 48 * 60 * 60 * 1000
      ? "ok" : "unknown"
    return { cronJob: cron.name, schedule: cron.schedule, status }
  })

  return NextResponse.json({
    mrr, nrr, averageLtv,
    activeSubscribers: activeSubs.length,
    trialingCount: trialingSubs.length,
    totalLifetimeRevenue,
    projectedAnnualRevenue,
    churnRate,
    totalContractors: allProfiles.length,
    subscribers, trials, churned, pastDue, engagement,
    recentActivity: activity.slice(0, 20),
    monthlyRevenue, onboardingFunnel, trends, cohorts,
    topContractors, featureAdoption, geoDistribution, systemHealth,
    // New platform stats
    contractsSent: contractsSent || 0,
    contractsSigned: contractsSigned || 0,
    estimatesViewed: estimatesViewed || 0,
    landingPageViews,
    landingPageConversions,
    automationsSent: automationsSent || 0,
    timeSavedHours,
    paymentVolume,
    portalMessagesCount: portalMessagesCount || 0,
    smsCount: smsCount || 0,
    photosCount: photosCount || 0,
    platformStats: {
      totalJobs: totalJobs || 0,
      totalInvoices: totalInvoices || 0,
      totalInvoicesPaid: totalInvoicesPaid || 0,
      totalReports: totalReports || 0,
    },
    // 20 features data
    onboardingPerUser,
    seasonalForecast: { historical: seasonalForecast, forecast: forecastMonths },
    pricingExperiment,
    revenueBreakdown,
    trialActivity,
    npsScore,
    currentGoal,
    dunningStats: { total: dunningAll.length, recovered: dunningRecovered, recoveredAmount: dunningRecoveredAmount },
    cancellationReasons: reasonCounts,
    recentAlerts: (alertHistoryItems || []).slice(0, 5),
  })
}
