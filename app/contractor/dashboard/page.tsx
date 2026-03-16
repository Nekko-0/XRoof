"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import { useRole } from "@/lib/role-context"
import { EmptyState } from "@/components/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  RevenueChart, JobsChart, MiniStatCard, PipelineTicker,
  DealVelocityMeter, ZipHeatmap, ProfitChart,
} from "@/components/dashboard-charts"
import { OnboardingWizard } from "@/components/onboarding-wizard"
import {
  CheckCircle, Ruler, TrendingUp, Plus, Calendar,
  AlertTriangle, Bell, Clock, ArrowRight, BarChart3, Target,
  Send, LayoutDashboard, Circle, X, Zap, FileText, Star, Download,
} from "lucide-react"
import { HelpTooltip } from "@/components/help-tooltip"
import { GoogleReviewsBadge } from "@/components/google-reviews-badge"

type Job = {
  id: string
  address: string
  zip_code: string | null
  customer_name: string
  status: string
  budget: number | null
  created_at: string
  scheduled_date: string | null
  accepted_at: string | null
  estimate_sent_at: string | null
  signed_at: string | null
  completed_at: string | null
}

type Followup = {
  id: string
  note: string
  due_date: string
  job_id: string
  jobs?: { customer_name: string; address: string }
}

type Appointment = {
  id: string
  title: string
  date: string
  time: string | null
  type: string
}

export default function ContractorDashboard() {
  const { accountId } = useRole()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<{
    monthly: any[]; totalRevenue: number; totalJobsCompleted: number;
    totalLeads?: number; closeRate?: number; acceptRate?: number;
    totalCosts?: number; totalProfit?: number; avgMargin?: number;
    sources?: { source: string; count: number }[];
    closeRateTrend?: { month: string; rate: number }[];
    dealVelocity?: { stage: string; avgDays: number; benchmark: number }[];
    zipRevenue?: { zip: string; revenue: number; count: number }[];
    recentActivity?: { text: string; type: string; amount: number; date: string }[];
    reviewRequestCount?: number;
  } | null>(null)
  const [gettingStarted, setGettingStarted] = useState<{
    profile: boolean; lead: boolean; estimate: boolean; automations: boolean; stripe: boolean
  } | null>(null)
  const [gettingStartedDismissed, setGettingStartedDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("xroof_getting_started_dismissed") === "true"
    }
    return false
  })

  // Stats
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [totalJobs, setTotalJobs] = useState(0)
  const [pipelineValue, setPipelineValue] = useState(0)

  // Attention items
  const [overdueFollowups, setOverdueFollowups] = useState<Followup[]>([])
  const [staleJobs, setStaleJobs] = useState<Job[]>([])
  const [visitRequests, setVisitRequests] = useState<{ id: string; body: string; created_at: string }[]>([])
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [recentJobs, setRecentJobs] = useState<Job[]>([])
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [dashUserId, setDashUserId] = useState("")

  // Outstanding invoices
  const [outstandingTotal, setOutstandingTotal] = useState(0)

  // Google Reviews
  const [googleReviewUrl, setGoogleReviewUrl] = useState("")
  const [googleReviewsCache, setGoogleReviewsCache] = useState<{ rating: number; reviewCount: number } | null>(null)

  // Weather events for storm correlation
  const [weatherEvents, setWeatherEvents] = useState<{ date: string; type: string; description: string }[]>([])

  // Funnel analytics
  const [funnelData, setFunnelData] = useState<{
    funnel: { leads: number; estimates_sent: number; estimates_viewed: number; accepted: number; paid: number }
    conversion_rates: { lead_to_estimate: number; estimate_to_view: number; view_to_accept: number; accept_to_paid: number; overall: number }
    by_source: Record<string, { leads: number; accepted: number; rate: number }>
    by_job_type: Record<string, { leads: number; accepted: number; rate: number; avg_value: number }>
    revenue: { pipeline: number; closed: number; lost: number }
  } | null>(null)


  useEffect(() => {
    if (!accountId) return
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      const uid = accountId || session.user.id
      setDashUserId(uid)
      const today = new Date().toISOString().slice(0, 10)

      // Check onboarding + google reviews
      const { data: profileData } = await supabase
        .from("profiles")
        .select("onboarding_completed, google_review_url, google_reviews_cache")
        .eq("id", uid)
        .single()
      if (profileData && !profileData.onboarding_completed) {
        setShowOnboarding(true)
      }
      if (profileData?.google_review_url) setGoogleReviewUrl(profileData.google_review_url)
      if (profileData?.google_reviews_cache) setGoogleReviewsCache(profileData.google_reviews_cache as any)

      const [jobsRes, followupsRes, appointmentsRes, invoicesRes, costsRes] = await Promise.all([
        supabase.from("jobs")
          .select("id, address, zip_code, customer_name, status, budget, created_at, scheduled_date, accepted_at, estimate_sent_at, signed_at, completed_at")
          .eq("contractor_id", uid)
          .order("created_at", { ascending: false }),
        supabase.from("followups")
          .select("id, note, due_date, job_id, jobs(customer_name, address)")
          .eq("user_id", uid)
          .eq("completed", false)
          .lte("due_date", today)
          .order("due_date", { ascending: true })
          .limit(5),
        authFetch(`/api/appointments?contractor_id=${uid}`).then((r) => r.json()),
        supabase.from("invoices")
          .select("id, total, status")
          .eq("contractor_id", uid)
          .in("status", ["sent"]),
        supabase.from("invoices")
          .select("job_id, total, status")
          .eq("contractor_id", uid)
          .eq("status", "paid"),
      ])

      const jobs = jobsRes.data || []
      setRecentJobs(jobs.slice(0, 8))

      // Count by status
      const counts: Record<string, number> = {}
      let pValue = 0
      for (const j of jobs) {
        counts[j.status] = (counts[j.status] || 0) + 1
        if (j.status !== "Completed" && j.status !== "Lost" && j.budget) {
          pValue += j.budget
        }
      }
      setStatusCounts(counts)
      setTotalJobs(jobs.length)
      setPipelineValue(pValue)

      // Stale jobs -- accepted/estimate sent but no activity in 7+ days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const stale = jobs.filter(
        (j) => ["Accepted", "Estimate Sent"].includes(j.status) && j.created_at < sevenDaysAgo
      ).slice(0, 5)
      setStaleJobs(stale)

      setOverdueFollowups((followupsRes.data as any) || [])

      // Visit requests (unread notifications)
      const { data: visitReqs } = await supabase
        .from("notifications")
        .select("id, body, created_at")
        .eq("user_id", uid)
        .eq("type", "visit_request")
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5)
      setVisitRequests(visitReqs || [])

      // Today's appointments
      const todayAppts = (Array.isArray(appointmentsRes) ? appointmentsRes : [])
        .filter((a: any) => a.date === today)
      setTodayAppointments(todayAppts)

      // Outstanding invoices
      const unpaid = invoicesRes.data || []
      setOutstandingTotal(unpaid.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0))

      // Fetch job costs for profit tracking
      const jobIds = jobs.map((j: Job) => j.id)
      let allCosts: { job_id: string; amount: number }[] = []
      if (jobIds.length > 0) {
        const { data: costRows } = await supabase
          .from("job_costs")
          .select("job_id, amount")
          .in("job_id", jobIds)
        allCosts = costRows || []
      }

      // Build paid invoice revenue map
      const paidInvoices = costsRes.data || []
      const invoiceRevenueMap: Record<string, number> = {}
      for (const inv of paidInvoices) {
        if (inv.job_id) invoiceRevenueMap[inv.job_id] = (invoiceRevenueMap[inv.job_id] || 0) + (inv.total || 0)
      }

      // Analytics — computed client-side from already-fetched jobs
      setAnalytics(computeAnalytics(jobs, allCosts, invoiceRevenueMap))

      // Fetch weather for storm correlation
      const firstZip = extractZipFromJobs(jobs)
      if (firstZip) {
        try {
          const wRes = await authFetch(`/api/weather?zip=${firstZip}`)
          if (wRes.ok) {
            const wData = await wRes.json()
            const stormTypes = ["Thunderstorm", "Rain", "Snow", "Drizzle"]
            const events = (wData.forecast || [])
              .filter((f: any) => stormTypes.some((s) => f.description?.includes(s)))
              .map((f: any) => ({
                date: f.date,
                type: f.description?.toLowerCase().includes("thunder") ? "hail" : "storm",
                description: f.description,
              }))
            setWeatherEvents(events)
          }
        } catch {}
      }

      // Getting Started checks
      const [profileRes, reportsCountRes, automationsCountRes] = await Promise.all([
        supabase.from("profiles").select("company_name, stripe_account_id").eq("id", uid).single(),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("contractor_id", uid),
        supabase.from("automations").select("id", { count: "exact", head: true }).eq("contractor_id", uid),
      ])
      setGettingStarted({
        profile: !!(profileRes.data?.company_name),
        lead: jobs.length > 0,
        estimate: (reportsCountRes.count || 0) > 0,
        automations: (automationsCountRes.count || 0) > 0,
        stripe: !!(profileRes.data?.stripe_account_id),
      })

      setLoading(false)

      // Fetch funnel analytics (non-blocking)
      authFetch("/api/analytics/funnel?period=30")
        .then((r) => r.json())
        .then((data) => { if (data.funnel) setFunnelData(data) })
        .catch(() => {})
    }
    load()
  }, [accountId])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        {/* Chart area */}
        <Skeleton className="h-64 w-full rounded-2xl" />
        {/* Recent jobs list */}
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const gettingStartedSteps = gettingStarted ? [
    { key: "profile" as const, done: gettingStarted.profile, title: "Complete your profile", desc: "Add your company name and business details", href: "/contractor/profile" },
    { key: "lead" as const, done: gettingStarted.lead, title: "Add your first lead", desc: "Create a job to start tracking your pipeline", href: "/contractor/leads" },
    { key: "estimate" as const, done: gettingStarted.estimate, title: "Create your first estimate", desc: "Build and send a professional proposal", href: "/contractor/report" },
    { key: "automations" as const, done: gettingStarted.automations, title: "Set up automations", desc: "Automate follow-ups and reminders", href: "/contractor/automations" },
    { key: "stripe" as const, done: gettingStarted.stripe, title: "Connect Stripe", desc: "Accept online payments from customers", href: "/contractor/billing" },
  ] : []
  const gettingStartedComplete = gettingStartedSteps.filter((s) => s.done).length
  const allStepsDone = gettingStartedComplete === 5
  const showGettingStarted = gettingStarted && !allStepsDone && !gettingStartedDismissed

  const dismissGettingStarted = () => {
    setGettingStartedDismissed(true)
    localStorage.setItem("xroof_getting_started_dismissed", "true")
  }

  const funnelStages = [
    { label: "New", count: statusCounts["New"] || 0, color: "bg-gray-500" },
    { label: "Accepted", count: statusCounts["Accepted"] || 0, color: "bg-amber-500" },
    { label: "Estimate Sent", count: statusCounts["Estimate Sent"] || 0, color: "bg-blue-500" },
    { label: "Scheduled", count: statusCounts["Scheduled"] || 0, color: "bg-blue-600" },
    { label: "In Progress", count: statusCounts["In Progress"] || 0, color: "bg-blue-500" },
    { label: "Completed", count: statusCounts["Completed"] || 0, color: "bg-emerald-500" },
  ]

  const closeRate = totalJobs > 0
    ? Math.round(((statusCounts["Completed"] || 0) / totalJobs) * 100)
    : 0

  const attentionCount = overdueFollowups.length + staleJobs.length + visitRequests.length

  // Build ticker items from recent activity
  const tickerItems = (analytics?.recentActivity || []).map((a) => ({
    text: a.text,
    color: a.type === "completed" ? "emerald" : a.type === "new" ? "amber" : "blue",
    amount: a.amount,
  }))

  // Build sparkline data from monthly analytics
  const revenueSparkData = (analytics?.monthly || []).map((m: any) => m.revenue || 0)
  const jobsSparkData = (analytics?.monthly || []).map((m: any) => m.jobs || 0)
  const cumulativeSparkData = (analytics?.monthly || []).map((m: any) => m.cumulative || 0)

  // Compute percentage changes (last month vs prior month)
  const computeChange = (arr: number[]): string | undefined => {
    if (arr.length < 2) return undefined
    const curr = arr[arr.length - 1]
    const prev = arr[arr.length - 2]
    if (prev === 0) return curr > 0 ? "+100%" : undefined
    const pct = ((curr - prev) / prev) * 100
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`
  }

  const revenueChange = computeChange(revenueSparkData)
  const jobsChange = computeChange(jobsSparkData)

  // Deal velocity stages for meter
  const velocityStages = (analytics?.dealVelocity || []).map((d) => ({
    name: d.stage,
    avgDays: d.avgDays,
    benchmark: (d as any).benchmark ?? 7,
  }))

  // CSV Export
  const handleExportCSV = () => {
    if (!analytics) return
    const rows: string[][] = []

    // Header info
    rows.push(["XRoof Analytics Export", new Date().toLocaleDateString()])
    rows.push([])

    // Summary
    rows.push(["SUMMARY"])
    rows.push(["Metric", "Value"])
    rows.push(["Total Revenue", `$${analytics.totalRevenue.toLocaleString()}`])
    rows.push(["Jobs Completed", String(analytics.totalJobsCompleted)])
    rows.push(["Total Leads", String(analytics.totalLeads || 0)])
    rows.push(["Close Rate", `${analytics.closeRate || 0}%`])
    rows.push(["Accept Rate", `${analytics.acceptRate || 0}%`])
    rows.push(["Total Costs", `$${(analytics.totalCosts || 0).toLocaleString()}`])
    rows.push(["Net Profit", `$${(analytics.totalProfit || 0).toLocaleString()}`])
    rows.push(["Avg Margin", `${analytics.avgMargin || 0}%`])
    rows.push(["Outstanding Invoices", `$${outstandingTotal.toLocaleString()}`])
    rows.push(["Pipeline Value", `$${pipelineValue.toLocaleString()}`])
    rows.push([])

    // Monthly breakdown
    rows.push(["MONTHLY BREAKDOWN"])
    rows.push(["Month", "Revenue", "Costs", "Profit", "Jobs", "Cumulative Revenue"])
    for (const m of analytics.monthly) {
      rows.push([m.month, `$${m.revenue}`, `$${m.costs}`, `$${m.profit}`, String(m.jobs), `$${m.cumulative}`])
    }
    rows.push([])

    // Funnel data
    if (funnelData) {
      rows.push(["CONVERSION FUNNEL (30 DAYS)"])
      rows.push(["Stage", "Count"])
      rows.push(["Leads", String(funnelData.funnel.leads)])
      rows.push(["Estimates Sent", String(funnelData.funnel.estimates_sent)])
      rows.push(["Estimates Viewed", String(funnelData.funnel.estimates_viewed)])
      rows.push(["Accepted", String(funnelData.funnel.accepted)])
      rows.push(["Paid", String(funnelData.funnel.paid)])
      rows.push([])
      rows.push(["CONVERSION RATES"])
      rows.push(["Lead to Estimate", `${funnelData.conversion_rates.lead_to_estimate}%`])
      rows.push(["Estimate to Viewed", `${funnelData.conversion_rates.estimate_to_view}%`])
      rows.push(["Viewed to Accepted", `${funnelData.conversion_rates.view_to_accept}%`])
      rows.push(["Accepted to Paid", `${funnelData.conversion_rates.accept_to_paid}%`])
      rows.push(["Overall", `${funnelData.conversion_rates.overall}%`])
      rows.push([])

      // By source
      if (Object.keys(funnelData.by_source).length > 0) {
        rows.push(["CLOSE RATE BY SOURCE"])
        rows.push(["Source", "Leads", "Accepted", "Rate"])
        for (const [source, data] of Object.entries(funnelData.by_source)) {
          rows.push([source, String(data.leads), String(data.accepted), `${data.rate}%`])
        }
        rows.push([])
      }

      // By job type
      if (Object.keys(funnelData.by_job_type).length > 0) {
        rows.push(["PERFORMANCE BY JOB TYPE"])
        rows.push(["Job Type", "Leads", "Accepted", "Rate", "Avg Value"])
        for (const [jt, data] of Object.entries(funnelData.by_job_type)) {
          rows.push([jt, String(data.leads), String(data.accepted), `${data.rate}%`, `$${data.avg_value.toLocaleString()}`])
        }
        rows.push([])
      }

      // Revenue pipeline
      rows.push(["REVENUE PIPELINE"])
      rows.push(["Pipeline", `$${funnelData.revenue.pipeline.toLocaleString()}`])
      rows.push(["Closed", `$${funnelData.revenue.closed.toLocaleString()}`])
      rows.push(["Lost", `$${funnelData.revenue.lost.toLocaleString()}`])
      rows.push([])
    }

    // Deal velocity
    if (analytics.dealVelocity && analytics.dealVelocity.length > 0) {
      rows.push(["DEAL VELOCITY"])
      rows.push(["Stage", "Avg Days", "Benchmark"])
      for (const d of analytics.dealVelocity) {
        rows.push([d.stage, String(d.avgDays), String(d.benchmark)])
      }
      rows.push([])
    }

    // Zip revenue
    if (analytics.zipRevenue && analytics.zipRevenue.length > 0) {
      rows.push(["REVENUE BY ZIP CODE"])
      rows.push(["Zip Code", "Revenue", "Job Count"])
      for (const z of analytics.zipRevenue) {
        rows.push([z.zip, `$${z.revenue.toLocaleString()}`, String(z.count)])
      }
      rows.push([])
    }

    // Close rate trend
    if (analytics.closeRateTrend && analytics.closeRateTrend.length > 0) {
      rows.push(["CLOSE RATE TREND"])
      rows.push(["Month", "Rate"])
      for (const t of analytics.closeRateTrend) {
        rows.push([t.month, `${t.rate}%`])
      }
    }

    // Build CSV string
    const csvContent = rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `XRoof-Analytics-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Onboarding Wizard */}
      {showOnboarding && dashUserId && (
        <OnboardingWizard userId={dashUserId} onComplete={() => setShowOnboarding(false)} />
      )}

      {/* B) Pipeline Ticker -- live scrolling activity (tablet+) */}
      {tickerItems.length > 0 && <div className="hidden md:block"><PipelineTicker items={tickerItems} /></div>}

      {/* Getting Started Checklist (tablet+) */}
      {showGettingStarted && (
        <div className="hidden md:block rounded-2xl border border-border bg-card p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>Getting Started</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{gettingStartedComplete} of 5 complete</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-24 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(gettingStartedComplete / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">{Math.round((gettingStartedComplete / 5) * 100)}%</span>
              </div>
              <button
                onClick={dismissGettingStarted}
                className="rounded-lg p-1 hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {gettingStartedSteps.map((step) => (
              <Link
                key={step.key}
                href={step.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-secondary/40 group ${
                  step.done ? "opacity-60" : ""
                }`}
              >
                {step.done ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0 group-hover:text-primary/60 transition-colors" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${step.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                </div>
                {!step.done && (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/contractor/leads" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm hover:bg-secondary/30 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">New Lead</p>
            <p className="text-[10px] text-muted-foreground">Add a job</p>
          </div>
        </Link>
        <Link href="/contractor/measure" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm hover:bg-secondary/30 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Ruler className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Measure</p>
            <p className="text-[10px] text-muted-foreground">Roof tool</p>
          </div>
        </Link>
        <Link href="/contractor/report" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm hover:bg-secondary/30 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <Send className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Estimate</p>
            <p className="text-[10px] text-muted-foreground">Send quote</p>
          </div>
        </Link>
        <Link href="/contractor/calendar" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm hover:bg-secondary/30 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Calendar className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Calendar</p>
            <p className="text-[10px] text-muted-foreground">Schedule</p>
          </div>
        </Link>
      </div>

      {/* Pipeline Summary + Close Rate (tablet+) */}
      <div className="hidden md:grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Conversion Funnel */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Target className="h-3.5 w-3.5" /> Sales Funnel
          </h3>
          <div className="flex flex-col gap-2">
            {funnelStages.map((stage) => {
              const maxCount = Math.max(...funnelStages.map((s) => s.count), 1)
              const pct = (stage.count / maxCount) * 100
              return (
                <div key={stage.label} className="flex items-center gap-3">
                  <span className="w-24 text-[11px] font-medium text-muted-foreground truncate">{stage.label}</span>
                  <div className="flex-1 h-6 rounded-lg bg-secondary/50 overflow-hidden">
                    <div
                      className={`h-full ${stage.color} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max(pct, stage.count > 0 ? 8 : 0)}%` }}
                    >
                      {stage.count > 0 && (
                        <span className="text-[10px] font-bold text-white">{stage.count}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-primary">{closeRate}%</p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Close Rate <HelpTooltip text="Percentage of leads that resulted in a signed contract. Close Rate = Contracts Signed ÷ Total Leads × 100" /></p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-foreground">${pipelineValue.toLocaleString()}</p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pipeline Value <HelpTooltip text="Total estimated value of all active (non-completed, non-hidden) leads in your pipeline" /></p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-foreground">{totalJobs}</p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Jobs</p>
          </div>
        </div>
      </div>

      {/* Conversion Funnel Analytics (30-day, tablet+) */}
      {funnelData && (
        <div className="hidden md:grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Conversion Rates */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Conversion Rates (30 days) <HelpTooltip text="How leads move through your pipeline: leads → estimates sent → viewed → accepted → paid" />
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Lead → Estimate", value: funnelData.conversion_rates.lead_to_estimate },
                { label: "Estimate → Viewed", value: funnelData.conversion_rates.estimate_to_view },
                { label: "Viewed → Accepted", value: funnelData.conversion_rates.view_to_accept },
                { label: "Accepted → Paid", value: funnelData.conversion_rates.accept_to_paid },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-border/50 bg-background/50 p-3 text-center">
                  <p className={`text-xl font-bold ${metric.value >= 50 ? "text-emerald-500" : metric.value >= 25 ? "text-amber-500" : "text-red-400"}`}>
                    {metric.value}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">{metric.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-primary/5 border border-primary/20 p-3 text-center">
              <p className="text-2xl font-bold text-primary">{funnelData.conversion_rates.overall}%</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Overall Lead-to-Paid Rate</p>
            </div>
          </div>

          {/* Close Rate by Source */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" /> Close Rate by Source (30 days) <HelpTooltip text="Which lead sources (organic, referral, landing page, etc.) convert to signed contracts most often" />
            </h3>
            {Object.keys(funnelData.by_source).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(funnelData.by_source)
                  .sort((a, b) => b[1].leads - a[1].leads)
                  .map(([source, data]) => (
                    <div key={source} className="flex items-center gap-3">
                      <span className="w-20 text-[11px] font-medium text-muted-foreground truncate capitalize">{source}</span>
                      <div className="flex-1 h-5 rounded-lg bg-secondary/50 overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-lg flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(data.rate, data.leads > 0 ? 5 : 0)}%` }}
                        >
                          {data.rate > 15 && (
                            <span className="text-[9px] font-bold text-white">{data.rate}%</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground w-16 text-right">{data.accepted}/{data.leads} leads</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Needs Attention */}
      {attentionCount > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" /> Needs Attention ({attentionCount})
          </h3>
          <div className="flex flex-col gap-2">
            {visitRequests.map((vr) => (
              <Link key={vr.id} href="/contractor/messages"
                className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-card px-4 py-3 hover:bg-secondary/30 transition-colors">
                <Calendar className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{vr.body}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(vr.created_at).toLocaleDateString()}</p>
                </div>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-400">New</span>
              </Link>
            ))}
            {overdueFollowups.map((f) => (
              <Link key={f.id} href="/contractor/calendar"
                className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-card px-4 py-3 hover:bg-secondary/30 transition-colors">
                <Bell className="h-4 w-4 text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    Overdue: {(f.jobs as any)?.customer_name || "Follow-up"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{f.note}</p>
                </div>
                <span className="text-[10px] font-semibold text-red-400">Due {f.due_date?.slice(5)}</span>
              </Link>
            ))}
            {staleJobs.map((j) => (
              <Link key={j.id} href="/contractor/pipeline"
                className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-card px-4 py-3 hover:bg-secondary/30 transition-colors">
                <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    Stale: {j.customer_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{j.address}</p>
                </div>
                <span className="text-[10px] font-semibold text-amber-400">{j.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Today's Appointments */}
      {todayAppointments.length > 0 && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
            <Calendar className="h-3.5 w-3.5" /> Today&apos;s Schedule ({todayAppointments.length})
          </h3>
          <div className="flex flex-col gap-2">
            {todayAppointments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-card px-4 py-3">
                <span className="text-xs font-bold text-blue-400 w-12">{a.time || "TBD"}</span>
                <p className="text-xs font-bold text-foreground flex-1 truncate">{a.title}</p>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-400 capitalize">{a.type.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics (tablet+) */}
      {analytics && (
        <div className="hidden md:flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" /> Performance
            </h3>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MiniStatCard
              label="Total Revenue"
              value={`$${analytics.totalRevenue.toLocaleString()}`}
              trend={analytics.totalRevenue > 0 ? "up" : "flat"}
              change={revenueChange}
              sparkData={cumulativeSparkData}
            />
            <MiniStatCard
              label="Jobs Completed"
              value={analytics.totalJobsCompleted.toString()}
              trend={analytics.totalJobsCompleted > 0 ? "up" : "flat"}
              change={jobsChange}
              sparkData={jobsSparkData}
            />
            <MiniStatCard
              label="Avg Job Value"
              value={analytics.totalJobsCompleted > 0 ? `$${Math.round(analytics.totalRevenue / analytics.totalJobsCompleted).toLocaleString()}` : "$0"}
              sparkData={revenueSparkData}
            />
            <MiniStatCard
              label="Close Rate"
              value={`${analytics.closeRate || 0}%`}
              trend={(analytics.closeRate || 0) > 30 ? "up" : "flat"}
              sparkData={analytics.closeRateTrend?.map((t) => t.rate)}
            />
            <MiniStatCard
              label="Total Leads"
              value={String(analytics.totalLeads || 0)}
              trend={(analytics.totalLeads || 0) > 0 ? "up" : "flat"}
            />
            <MiniStatCard
              label="Outstanding"
              value={`$${outstandingTotal.toLocaleString()}`}
              trend={outstandingTotal > 0 ? "down" : "flat"}
            />
            <MiniStatCard
              label="Reviews Requested"
              value={String(analytics.reviewRequestCount || 0)}
              trend={(analytics.reviewRequestCount || 0) > 0 ? "up" : "flat"}
            />
            {googleReviewUrl && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-3 shadow-sm">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Google Reviews</p>
                <GoogleReviewsBadge
                  rating={googleReviewsCache?.rating || 0}
                  reviewCount={googleReviewsCache?.reviewCount || 0}
                  reviewUrl={googleReviewUrl}
                />
              </div>
            )}
            {(analytics.totalCosts || 0) > 0 && (
              <>
                <MiniStatCard
                  label="Total Costs"
                  value={`$${(analytics.totalCosts || 0).toLocaleString()}`}
                  trend="flat"
                />
                <MiniStatCard
                  label="Net Profit"
                  value={`$${(analytics.totalProfit || 0).toLocaleString()}`}
                  trend={(analytics.totalProfit || 0) > 0 ? "up" : "down"}
                />
                <MiniStatCard
                  label="Avg Margin"
                  value={`${analytics.avgMargin || 0}%`}
                  trend={(analytics.avgMargin || 0) > 20 ? "up" : "flat"}
                />
              </>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RevenueChart
              data={analytics.monthly}
              weatherEvents={weatherEvents.length > 0 ? weatherEvents : undefined}
              pipelineValue={pipelineValue}
              closeRate={analytics.closeRate || 0}
            />
            <JobsChart data={analytics.monthly} />
          </div>
          {analytics.monthly.some((m: any) => m.costs > 0) && (
            <ProfitChart data={analytics.monthly} />
          )}

          {/* D) Deal Velocity Meter */}
          <DealVelocityMeter stages={velocityStages} />

          {/* E) Zip Code Revenue Heatmap */}
          <ZipHeatmap data={analytics.zipRevenue || []} />

          {/* Lead Sources + Close Rate Trend */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {analytics.sources && analytics.sources.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Lead Sources</p>
                <div className="flex flex-col gap-2">
                  {analytics.sources.map((s) => {
                    const pct = (analytics.totalLeads || 1) > 0 ? Math.round((s.count / (analytics.totalLeads || 1)) * 100) : 0
                    return (
                      <div key={s.source} className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          s.source === "widget" ? "bg-blue-500/15 text-blue-400" :
                          s.source === "manual" ? "bg-emerald-500/15 text-emerald-400" :
                          s.source === "referral" ? "bg-primary/15 text-primary" :
                          "bg-secondary text-muted-foreground"
                        }`}>{s.source}</span>
                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-foreground">{s.count}</span>
                        <span className="text-[10px] text-muted-foreground">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {analytics.closeRateTrend && analytics.closeRateTrend.some((t) => t.rate > 0) && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Close Rate Trend <HelpTooltip text="Monthly close rate over time — helps identify seasonal patterns and improvement trends" /></p>
                <div className="flex items-end gap-2 h-24">
                  {analytics.closeRateTrend.map((t) => (
                    <div key={t.month} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-foreground">{t.rate}%</span>
                      <div className="w-full rounded-t bg-primary/40" style={{ height: `${Math.max(t.rate, 2)}%` }} />
                      <span className="text-[9px] text-muted-foreground">{t.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" /> Recent Jobs
          </h3>
          <Link href="/contractor/pipeline" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
            View Pipeline <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentJobs.length === 0 ? (
          <EmptyState
            icon={LayoutDashboard}
            title="Welcome to XRoof"
            description="Get started by adding your first lead or measuring a roof."
            actionLabel="Add First Lead"
            onAction={() => window.location.href = "/contractor/leads"}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {recentJobs.map((j) => (
              <div key={j.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                  j.status === "Completed" ? "bg-emerald-500" :
                  j.status === "In Progress" ? "bg-blue-500" :
                  j.status === "Lost" ? "bg-red-500" :
                  "bg-amber-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{j.customer_name || j.address}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{j.address}</p>
                </div>
                {j.budget && <span className="text-xs font-bold text-foreground">${j.budget.toLocaleString()}</span>}
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold text-white ${
                  j.status === "Completed" ? "bg-emerald-500" :
                  j.status === "In Progress" ? "bg-blue-500" :
                  j.status === "Lost" ? "bg-red-500" :
                  "bg-amber-500"
                }`}>{j.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

/** Extract first 5-digit zip code from a list of jobs */
function extractZipFromJobs(jobs: Job[]): string | null {
  for (const j of jobs) {
    if (!j.address) continue
    const match = j.address.match(/\b(\d{5})\b/)
    if (match) return match[1]
  }
  return null
}

/** Compute all analytics from jobs array (avoids RLS issues with server-side API) */
function computeAnalytics(
  allJobs: Job[],
  allCosts: { job_id: string; amount: number }[] = [],
  invoiceRevenueMap: Record<string, number> = {},
) {
  const completed = allJobs.filter((j) => j.status === "Completed")
  const now = new Date()

  // Build cost map by job
  const costsByJob: Record<string, number> = {}
  for (const c of allCosts) {
    costsByJob[c.job_id] = (costsByJob[c.job_id] || 0) + Number(c.amount)
  }

  // Revenue by month
  const monthlyRevenue: Record<string, number> = {}
  const monthlyCosts: Record<string, number> = {}
  const monthlyCount: Record<string, number> = {}
  let totalRevenue = 0
  let totalCosts = 0
  for (const j of completed) {
    const date = j.created_at
    if (!date) continue
    const month = date.slice(0, 7)
    const jobRevenue = invoiceRevenueMap[j.id] || Number(j.budget) || 0
    const jobCost = costsByJob[j.id] || 0
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + jobRevenue
    monthlyCosts[month] = (monthlyCosts[month] || 0) + jobCost
    monthlyCount[month] = (monthlyCount[month] || 0) + 1
    totalRevenue += jobRevenue
    totalCosts += jobCost
  }

  const totalProfit = totalRevenue - totalCosts
  const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0

  // Last 12 months
  const monthly: { month: string; revenue: number; costs: number; profit: number; jobs: number; cumulative: number }[] = []
  let cumulative = 0
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("en-US", { month: "short" })
    const revenue = monthlyRevenue[key] || 0
    const costs = monthlyCosts[key] || 0
    const jobCount = monthlyCount[key] || 0
    cumulative += revenue
    monthly.push({ month: label, revenue, costs, profit: revenue - costs, jobs: jobCount, cumulative })
  }

  // Funnel
  const totalLeads = allJobs.length
  const accepted = allJobs.filter((j) => ["Accepted", "Completed"].includes(j.status)).length
  const closeRate = totalLeads > 0 ? Math.round((completed.length / totalLeads) * 100) : 0
  const acceptRate = totalLeads > 0 ? Math.round((accepted / totalLeads) * 100) : 0

  // Sources (not available in base select — would need source column)
  const sources: { source: string; count: number }[] = []
  const revBySrc: Record<string, number> = {}

  // Close rate trend (6 months)
  const mAll: Record<string, number> = {}
  const mComp: Record<string, number> = {}
  for (const j of allJobs) {
    if (!j.created_at) continue
    const m = j.created_at.slice(0, 7)
    mAll[m] = (mAll[m] || 0) + 1
    if (j.status === "Completed") mComp[m] = (mComp[m] || 0) + 1
  }
  const closeRateTrend: { month: string; rate: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("en-US", { month: "short" })
    const t = mAll[key] || 0
    const c = mComp[key] || 0
    closeRateTrend.push({ month: label, rate: t > 0 ? Math.round((c / t) * 100) : 0 })
  }

  // Deal velocity — real stage timestamps
  const daysBetween = (a: string | null, b: string | null) => {
    if (!a || !b) return null
    const ms = new Date(b).getTime() - new Date(a).getTime()
    return ms > 0 ? Math.round(ms / (1000 * 60 * 60 * 24)) : null
  }
  const stageArrays: Record<string, number[]> = { Lead: [], Estimate: [], Signed: [], Completed: [] }
  for (const j of allJobs) {
    const leadDays = daysBetween(j.created_at, j.accepted_at)
    const estDays = daysBetween(j.accepted_at, j.estimate_sent_at)
    const signDays = daysBetween(j.estimate_sent_at, j.signed_at)
    const compDays = daysBetween(j.signed_at, j.completed_at)
    if (leadDays !== null) stageArrays.Lead.push(leadDays)
    if (estDays !== null) stageArrays.Estimate.push(estDays)
    if (signDays !== null) stageArrays.Signed.push(signDays)
    if (compDays !== null) stageArrays.Completed.push(compDays)
  }
  const avgArr = (a: number[]) => a.length === 0 ? 0 : Math.round(a.reduce((x, y) => x + y, 0) / a.length)
  const dealVelocity = [
    { stage: "Lead", avgDays: avgArr(stageArrays.Lead), benchmark: 3 },
    { stage: "Estimate", avgDays: avgArr(stageArrays.Estimate), benchmark: 5 },
    { stage: "Signed", avgDays: avgArr(stageArrays.Signed), benchmark: 7 },
    { stage: "Completed", avgDays: avgArr(stageArrays.Completed), benchmark: 14 },
  ]

  // Zip revenue
  const zipMap: Record<string, { revenue: number; count: number }> = {}
  for (const j of allJobs) {
    const zip = j.zip_code || j.address?.match(/\b(\d{5})\b/)?.[1]
    if (!zip) continue
    if (!zipMap[zip]) zipMap[zip] = { revenue: 0, count: 0 }
    zipMap[zip].count += 1
    if (j.status === "Completed") zipMap[zip].revenue += Number(j.budget) || 0
  }
  const zipRevenue = Object.entries(zipMap)
    .map(([zip, d]) => ({ zip, revenue: d.revenue, count: d.count }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)

  // Recent activity
  const typeMap: Record<string, string> = {
    New: "new", Accepted: "progress", "Estimate Sent": "progress",
    Scheduled: "progress", "In Progress": "progress", Completed: "completed", Lost: "lost",
  }
  const recentActivity = allJobs.slice(0, 20).map((j) => ({
    text: j.status === "Completed" ? `Job completed: ${j.customer_name || "Unknown"}`
      : j.status === "New" ? `New lead: ${j.customer_name || "Unknown"}`
      : j.status === "Accepted" ? `Estimate accepted: ${j.customer_name || "Unknown"}`
      : `${j.status}: ${j.customer_name || "Unknown"}`,
    type: typeMap[j.status] || "new",
    amount: Number(j.budget) || 0,
    date: j.created_at || "",
  }))

  return {
    monthly, totalRevenue, totalJobsCompleted: completed.length,
    totalCosts, totalProfit, avgMargin,
    totalLeads, closeRate, acceptRate, sources, revenueBySource: revBySrc,
    closeRateTrend, dealVelocity, zipRevenue, recentActivity,
  }
}
