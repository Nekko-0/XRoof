"use client"

import { useEffect, useState, useMemo } from "react"
import { authFetch } from "@/lib/auth-fetch"
import Link from "next/link"
import {
  DollarSign, Users, Clock, TrendingUp, TrendingDown, AlertTriangle, Activity,
  ChevronDown, ChevronRight, ExternalLink, Mail, Download, BarChart3,
  UserCheck, UserX, Zap, ArrowRight, ArrowUp, ArrowDown, FileText,
  Globe, MessageSquare, Camera, Send, Timer, Trophy, Layers, MapPin,
  Heart, Minus, Eye, Target, Star, Bell, BookOpen, LifeBuoy, Swords,
  PieChart, Megaphone, Receipt, Shield, ClipboardCheck,
} from "lucide-react"
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Line, Cell, PieChart as RPieChart, Pie,
} from "recharts"

/* ── Types ── */
type Subscriber = {
  user_id: string; username: string; company_name: string; email: string
  plan: string; status: string; stripe_customer_id: string
  current_period_end: string; team_member_count: number; mrr_contribution: number; ltv: number
}
type Trial = {
  user_id: string; username: string; company_name: string; email: string
  plan: string; trial_ends: string; days_remaining: number; expiring_soon: boolean
}
type Churned = { user_id: string; username: string; company_name: string; plan: string; canceled_date: string; was_subscribed_days: number }
type PastDue = { user_id: string; username: string; company_name: string; email: string; plan: string; stripe_customer_id: string; days_past_due: number }
type Engagement = {
  user_id: string; username: string; company_name: string
  last_job_created: string | null; last_invoice_sent: string | null
  score: "active" | "idle" | "dormant"; healthScore: number; healthLevel: string
}
type TopContractor = { user_id: string; username: string; company_name: string; jobs_completed: number; invoices_paid: number; reports_made: number }
type Cohort = { month: string; signups: number; retention: number[] }
type Geo = { region: string; zipCount: number; contractorCount: number }
type ActivityItem = { type: string; description: string; timestamp: string }
type Analytics = {
  mrr: number; nrr: number; averageLtv: number
  activeSubscribers: number; trialingCount: number
  totalLifetimeRevenue: number; projectedAnnualRevenue: number
  churnRate: number; totalContractors: number
  subscribers: Subscriber[]; trials: Trial[]; churned: Churned[]
  pastDue: PastDue[]; engagement: Engagement[]
  recentActivity: ActivityItem[]
  monthlyRevenue: { month: string; subscriptions: number; reports: number; total: number; cumulative: number }[]
  onboardingFunnel: { signed_up: number; created_job: number; sent_invoice: number; got_paid: number }
  trends: { mrr: number; subscribers: number; revenue: number }
  cohorts: Cohort[]
  topContractors: TopContractor[]
  featureAdoption: Record<string, { used: number; total: number }>
  geoDistribution: Geo[]
  systemHealth: { cronJob: string; schedule: string; status: string }[]
  contractsSent: number; contractsSigned: number; estimatesViewed: number
  landingPageViews: number; landingPageConversions: number
  automationsSent: number; timeSavedHours: number; paymentVolume: number
  portalMessagesCount: number; smsCount: number; photosCount: number
  platformStats: { totalJobs: number; totalInvoices: number; totalInvoicesPaid: number; totalReports: number }
  // 20 features
  onboardingPerUser: { user_id: string; username: string; company_name: string; steps: { label: string; done: boolean }[]; pct: number; daysSinceSignup: number }[]
  seasonalForecast: { historical: any[]; forecast: { month: string; forecast: number }[] }
  pricingExperiment: { monthly: { total: number; active: number; trialing: number; canceled: number; conversionRate: number; arpu: number }; annual: { total: number; active: number; trialing: number; canceled: number; conversionRate: number; arpu: number } }
  revenueBreakdown: { monthlySubscriptions: number; annualSubscriptions: number; teamAddons: number; reportPurchases: number }
  trialActivity: { day: number; active: number; createdJob: number; sentInvoice: number; converted: number }[]
  npsScore: number | null
  currentGoal: { period: string; target_amount: number; start_date: string; end_date: string | null } | null
  dunningStats: { total: number; recovered: number; recoveredAmount: number }
  cancellationReasons: Record<string, number>
  recentAlerts: { message: string; triggered_at: string; acknowledged: boolean }[]
}

const SC: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  trialing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  past_due: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  canceled: "bg-red-500/15 text-red-400 border-red-500/30",
}

const HC: Record<string, string> = { healthy: "text-emerald-400", at_risk: "text-amber-400", needs_attention: "text-red-400" }

function Badge({ status }: { status: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SC[status] || "bg-muted text-muted-foreground border-border"}`}>{status.replace("_", " ")}</span>
}

function Trend({ value }: { value: number }) {
  if (value === 0) return <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Minus className="h-2.5 w-2.5" /> 0%</span>
  const up = value > 0
  return <span className={`flex items-center gap-0.5 text-[10px] font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>{up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}{Math.abs(value)}%</span>
}

function Metric({ label, value, sub, icon: Icon, color, trend }: { label: string; value: string; sub?: string; icon: any; color: string; trend?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}><Icon className="h-4 w-4" /></div>
        {trend !== undefined && <Trend value={trend} />}
      </div>
      <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      {sub && <p className="text-[9px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  )
}

function AdoptionBar({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-secondary/50">
        <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground w-16 text-right">{used}/{total} ({pct}%)</span>
    </div>
  )
}

function csv(data: Record<string, any>[], filename: string) {
  if (!data.length) return
  const keys = Object.keys(data[0])
  const content = [keys.join(","), ...data.map(row => keys.map(k => `"${row[k] ?? ""}"`).join(","))].join("\n")
  const blob = new Blob([content], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminDashboard() {
  const [d, setD] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [subSort, setSubSort] = useState<"mrr" | "status" | "health">("mrr")
  const [chartType, setChartType] = useState<"bar" | "line">("bar")

  useEffect(() => {
    authFetch("/api/analytics/admin")
      .then(res => { if (!res.ok) throw new Error("Unauthorized"); return res.json() })
      .then(setD)
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false))
  }, [])

  const sortedSubs = useMemo(() => {
    if (!d) return []
    const list = [...d.subscribers]
    if (subSort === "mrr") list.sort((a, b) => b.mrr_contribution - a.mrr_contribution)
    else if (subSort === "health") {
      list.sort((a, b) => {
        const ha = d.engagement.find(e => e.user_id === a.user_id)?.healthScore || 0
        const hb = d.engagement.find(e => e.user_id === b.user_id)?.healthScore || 0
        return ha - hb // worst first
      })
    } else list.sort((a, b) => {
      const order: Record<string, number> = { active: 0, trialing: 1, past_due: 2, canceled: 3 }
      return (order[a.status] ?? 4) - (order[b.status] ?? 4)
    })
    return list
  }, [d, subSort])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" /></div>
  if (error || !d) return <p className="p-6 text-red-400">{error || "Failed to load"}</p>

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="flex flex-col gap-5">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 p-6 shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-5 bottom-0 h-24 w-24 rounded-full bg-white/5" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>XRoof Owner Portal</h2>
        <p className="mt-1 text-sm text-indigo-100">{today}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-indigo-100">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {d.totalContractors} contractors</span>
          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> ${d.mrr} MRR</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {d.trialingCount} trial{d.trialingCount !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {d.nrr}% NRR</span>
          <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {d.timeSavedHours}h saved</span>
        </div>
      </div>

      {/* ── Row 1: Key metrics ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="MRR" value={`$${d.mrr.toLocaleString()}`} icon={DollarSign} color="bg-emerald-900/30 text-emerald-400" trend={d.trends.mrr} />
        <Metric label="Active Subs" value={d.activeSubscribers.toString()} icon={UserCheck} color="bg-indigo-900/30 text-indigo-400" />
        <Metric label="Free Trials" value={d.trialingCount.toString()} sub={d.trials.filter(t => t.expiring_soon).length > 0 ? `${d.trials.filter(t => t.expiring_soon).length} expiring` : undefined} icon={Clock} color="bg-blue-900/30 text-blue-400" />
        <Metric label="Lifetime Revenue" value={`$${Math.round(d.totalLifetimeRevenue).toLocaleString()}`} icon={TrendingUp} color="bg-purple-900/30 text-purple-400" trend={d.trends.revenue} />
        <Metric label="Projected Annual" value={`$${d.projectedAnnualRevenue.toLocaleString()}`} sub="MRR × 12 + trial conv." icon={BarChart3} color="bg-sky-900/30 text-sky-400" />
        <Metric label="Avg LTV" value={`$${d.averageLtv.toLocaleString()}`} sub="Lifetime value per contractor" icon={Heart} color="bg-pink-900/30 text-pink-400" />
      </div>

      {/* ── Row 2: NRR + Payment Volume + Time Saved ── */}
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Net Revenue Retention" value={`${d.nrr}%`} sub={d.nrr >= 100 ? "Growing from existing" : "Below 100% — contraction"} icon={d.nrr >= 100 ? TrendingUp : TrendingDown} color={d.nrr >= 100 ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"} />
        <Metric label="Payment Volume" value={`$${d.paymentVolume.toLocaleString()}`} sub="Collected through invoices" icon={DollarSign} color="bg-violet-900/30 text-violet-400" />
        <Metric label="Time Saved" value={`${d.timeSavedHours}h`} sub="Reports + automations + contracts" icon={Timer} color="bg-teal-900/30 text-teal-400" />
      </div>

      {/* ── Row 3: Revenue chart with toggle ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Revenue — Last 12 Months</h3>
          <div className="flex gap-1 rounded-lg bg-secondary/50 p-0.5">
            <button onClick={() => setChartType("bar")} className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${chartType === "bar" ? "bg-indigo-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>Bar</button>
            <button onClick={() => setChartType("line")} className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${chartType === "line" ? "bg-indigo-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>Line</button>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={d.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis tick={{ fill: "#888", fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="subscriptions" name="Subscriptions" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reports" name="Reports" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={d.monthlyRevenue}>
                <defs>
                  <linearGradient id="gradSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis tick={{ fill: "#888", fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="subscriptions" name="Subscriptions" stroke="#6366f1" strokeWidth={2} fill="url(#gradSub)" dot={{ r: 3, fill: "#6366f1" }} />
                <Area type="monotone" dataKey="reports" name="Reports" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradRep)" dot={{ r: 3, fill: "#8b5cf6" }} />
                <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 4: Platform stats (expanded) ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Platform Stats</h3>
          <button onClick={() => csv([{ ...d.platformStats, contractsSent: d.contractsSent, contractsSigned: d.contractsSigned, estimatesViewed: d.estimatesViewed, landingPageViews: d.landingPageViews, automationsSent: d.automationsSent, paymentVolume: d.paymentVolume, timeSavedHours: d.timeSavedHours }], "xroof-stats.csv")} className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"><Download className="h-3 w-3" /> Export</button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { icon: Users, label: "Contractors", value: d.totalContractors },
            { icon: Layers, label: "Total Jobs", value: d.platformStats.totalJobs },
            { icon: Send, label: "Invoices Sent", value: d.platformStats.totalInvoices },
            { icon: DollarSign, label: "Invoices Paid", value: d.platformStats.totalInvoicesPaid },
            { icon: FileText, label: "Reports", value: d.platformStats.totalReports },
            { icon: FileText, label: "Contracts Sent", value: d.contractsSent },
            { icon: FileText, label: "Contracts Signed", value: d.contractsSigned },
            { icon: Eye, label: "Estimates Viewed", value: d.estimatesViewed },
            { icon: Globe, label: "LP Views", value: d.landingPageViews },
            { icon: Zap, label: "Automations Sent", value: d.automationsSent },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 rounded-xl bg-secondary/30 p-3">
              <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-bold text-foreground">{s.value.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 5: Platform usage bars ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-semibold text-muted-foreground">Portal Messages</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{d.portalMessagesCount.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">Total homeowner-contractor messages</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-semibold text-muted-foreground">SMS Messages</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{d.smsCount.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">Text messages sent through XRoof</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-muted-foreground">Photos Uploaded</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{d.photosCount.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">Job photos documented</p>
        </div>
      </div>

      {/* ── Row 6: Subscribers table ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Subscribers</h3>
          <div className="flex gap-1">
            {(["mrr", "status", "health"] as const).map(s => (
              <button key={s} onClick={() => setSubSort(s)} className={`rounded-lg px-3 py-1 text-xs font-medium capitalize ${subSort === s ? "bg-indigo-500/20 text-indigo-400" : "text-muted-foreground hover:bg-secondary"}`}>{s}</button>
            ))}
            <button onClick={() => csv(d.subscribers, "xroof-subscribers.csv")} className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"><Download className="h-3 w-3" /> CSV</button>
          </div>
        </div>
        {sortedSubs.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No subscribers yet</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-2 font-medium"></th>
                <th className="pb-2 pr-3 font-medium">Contractor</th>
                <th className="pb-2 pr-3 font-medium">Plan</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Health</th>
                <th className="pb-2 pr-3 font-medium">Period End</th>
                <th className="pb-2 pr-3 font-medium">Team</th>
                <th className="pb-2 pr-3 font-medium">MRR</th>
                <th className="pb-2 pr-3 font-medium">LTV</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {sortedSubs.map(sub => {
                  const eng = d.engagement.find(e => e.user_id === sub.user_id)
                  return (
                    <tr key={sub.user_id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-2.5 pr-2"><button onClick={() => setExpandedRow(expandedRow === sub.user_id ? null : sub.user_id)}>{expandedRow === sub.user_id ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}</button></td>
                      <td className="py-2.5 pr-3"><p className="font-medium text-foreground">{sub.company_name || sub.username}</p><p className="text-[10px] text-muted-foreground">{sub.email}</p></td>
                      <td className="py-2.5 pr-3 capitalize">{sub.plan}</td>
                      <td className="py-2.5 pr-3"><Badge status={sub.status} /></td>
                      <td className="py-2.5 pr-3"><span className={`text-[10px] font-bold ${HC[eng?.healthLevel || ""] || "text-muted-foreground"}`}>{eng?.healthScore || 0}/100</span></td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{new Date(sub.current_period_end).toLocaleDateString()}</td>
                      <td className="py-2.5 pr-3">{sub.team_member_count}</td>
                      <td className="py-2.5 pr-3 font-medium text-emerald-400">${sub.mrr_contribution}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">${sub.ltv}</td>
                      <td className="py-2.5">
                        <div className="flex gap-1">
                          {sub.stripe_customer_id && <a href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Stripe"><ExternalLink className="h-3.5 w-3.5" /></a>}
                          {sub.email && <a href={`mailto:${sub.email}`} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Email"><Mail className="h-3.5 w-3.5" /></a>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Row 7: Trials + Past Due ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Clock className="h-4 w-4 text-blue-400" /> Free Trials ({d.trials.length})</h3>
          {d.trials.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No active trials</p> : (
            <div className="flex flex-col gap-2">{d.trials.map(t => (
              <div key={t.user_id} className={`flex items-center justify-between rounded-xl p-3 ${t.expiring_soon ? "bg-amber-500/10 border border-amber-500/30" : "bg-secondary/30"}`}>
                <div><p className="text-xs font-medium text-foreground">{t.company_name || t.username}</p><p className="text-[10px] text-muted-foreground">{t.email}</p></div>
                <div className="text-right"><p className={`text-xs font-bold ${t.expiring_soon ? "text-amber-400" : "text-blue-400"}`}>{t.days_remaining}d left</p>{t.expiring_soon && <p className="text-[9px] text-amber-400">Expiring!</p>}</div>
              </div>
            ))}</div>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><AlertTriangle className="h-4 w-4 text-amber-400" /> Payment Failures ({d.pastDue.length})</h3>
          {d.pastDue.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No failed payments</p> : (
            <div className="flex flex-col gap-2">{d.pastDue.map(p => (
              <div key={p.user_id} className="flex items-center justify-between rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                <div><p className="text-xs font-medium text-foreground">{p.company_name || p.username}</p><p className="text-[10px] text-muted-foreground">{p.email} &middot; {p.days_past_due}d overdue</p></div>
                {p.stripe_customer_id && <a href={`https://dashboard.stripe.com/customers/${p.stripe_customer_id}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-amber-500/20 px-2 py-1 text-[10px] font-medium text-amber-400 hover:bg-amber-500/30">Fix in Stripe</a>}
              </div>
            ))}</div>
          )}
        </div>
      </div>

      {/* ── Row 8: Churn ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><UserX className="h-4 w-4 text-red-400" /> Churn</h3>
          <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-400">{d.churnRate}% this month</span>
        </div>
        {d.churned.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No cancellations</p> : (
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 pr-4 font-medium">Contractor</th><th className="pb-2 pr-4 font-medium">Plan</th><th className="pb-2 pr-4 font-medium">Canceled</th><th className="pb-2 font-medium">Duration</th></tr></thead>
            <tbody>{d.churned.map(c => (<tr key={c.user_id} className="border-b border-border/50"><td className="py-2 pr-4 font-medium text-foreground">{c.company_name || c.username}</td><td className="py-2 pr-4 capitalize">{c.plan}</td><td className="py-2 pr-4 text-muted-foreground">{new Date(c.canceled_date).toLocaleDateString()}</td><td className="py-2 text-muted-foreground">{c.was_subscribed_days}d</td></tr>))}</tbody></table></div>
        )}
      </div>

      {/* ── Row 9: Onboarding funnel ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Zap className="h-4 w-4 text-indigo-400" /> Onboarding Funnel</h3>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "Signed Up", value: d.onboardingFunnel.signed_up },
            { label: "Created Job", value: d.onboardingFunnel.created_job },
            { label: "Sent Invoice", value: d.onboardingFunnel.sent_invoice },
            { label: "Got Paid", value: d.onboardingFunnel.got_paid },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className="rounded-xl bg-indigo-500/10 px-4 py-3 text-center min-w-[80px]">
                <p className="text-xl font-bold text-indigo-400">{step.value}</p>
                <p className="text-[10px] text-muted-foreground">{step.label}</p>
              </div>
              {i < arr.length - 1 && (
                <div className="flex flex-col items-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  <span className="text-[9px] text-muted-foreground/50">{step.value > 0 ? `${Math.round((arr[i + 1].value / step.value) * 100)}%` : "—"}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 10: Top Contractors + Feature Adoption ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Trophy className="h-4 w-4 text-amber-400" /> Top Contractors</h3>
          {d.topContractors.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No data yet</p> : (
            <div className="flex flex-col gap-2">
              {d.topContractors.map((c, i) => (
                <div key={c.user_id} className="flex items-center gap-3 rounded-xl bg-secondary/30 p-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-gray-400/20 text-gray-400" : i === 2 ? "bg-orange-600/20 text-orange-400" : "bg-secondary text-muted-foreground"}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.company_name || c.username}</p>
                    <p className="text-[9px] text-muted-foreground">{c.jobs_completed} jobs &middot; {c.invoices_paid} paid &middot; {c.reports_made} reports</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Layers className="h-4 w-4 text-indigo-400" /> Feature Adoption</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(d.featureAdoption).map(([key, val]) => (
              <AdoptionBar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} used={val.used} total={val.total} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 11: Cohort Retention ── */}
      {d.cohorts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cohort Retention</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Cohort</th>
                <th className="pb-2 pr-4 font-medium">Signups</th>
                {[...Array(6)].map((_, i) => <th key={i} className="pb-2 pr-3 font-medium text-center">M{i + 1}</th>)}
              </tr></thead>
              <tbody>
                {d.cohorts.map(c => (
                  <tr key={c.month} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium text-foreground">{c.month}</td>
                    <td className="py-2 pr-4">{c.signups}</td>
                    {[...Array(6)].map((_, i) => {
                      const val = c.retention[i]
                      const color = val === undefined ? "" : val >= 80 ? "bg-emerald-500/20 text-emerald-400" : val >= 50 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                      return <td key={i} className="py-2 pr-3 text-center"><span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${color}`}>{val !== undefined ? `${val}%` : "—"}</span></td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Row 12: Geographic Distribution ── */}
      {d.geoDistribution.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><MapPin className="h-4 w-4 text-indigo-400" /> Geographic Coverage</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {d.geoDistribution.map(g => {
              const maxZips = Math.max(...d.geoDistribution.map(x => x.zipCount))
              return (
                <div key={g.region} className="flex items-center gap-3 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{g.region}</p>
                    <p className="text-[9px] text-muted-foreground">{g.contractorCount} contractor{g.contractorCount !== 1 ? "s" : ""} &middot; {g.zipCount} zips</p>
                  </div>
                  <div className="w-20 h-1.5 rounded-full bg-secondary/50"><div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${(g.zipCount / maxZips) * 100}%` }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Row 13: Engagement + Activity ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Activity className="h-4 w-4 text-indigo-400" /> Health & Engagement</h3>
          <div className="mb-3 flex gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Healthy ({d.engagement.filter(e => e.healthLevel === "healthy").length})</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> At Risk ({d.engagement.filter(e => e.healthLevel === "at_risk").length})</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Needs Attention ({d.engagement.filter(e => e.healthLevel === "needs_attention").length})</span>
          </div>
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {[...d.engagement].sort((a, b) => a.healthScore - b.healthScore).map(e => (
              <div key={e.user_id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary/30">
                <p className="text-xs text-foreground">{e.company_name || e.username}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold ${HC[e.healthLevel] || "text-muted-foreground"}`}>{e.healthScore}/100</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize ${e.score === "active" ? "bg-emerald-500/15 text-emerald-400" : e.score === "idle" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>{e.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {d.recentActivity.map((a, i) => {
              const colors: Record<string, string> = { signup: "text-indigo-400", purchase: "text-purple-400", team: "text-blue-400", churn: "text-red-400" }
              return (
                <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-secondary/30">
                  <span className={`mt-0.5 text-[10px] font-bold uppercase ${colors[a.type] || "text-muted-foreground"}`}>{a.type}</span>
                  <div className="min-w-0 flex-1"><p className="text-xs text-foreground">{a.description}</p><p className="text-[10px] text-muted-foreground">{new Date(a.timestamp).toLocaleDateString()}</p></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Row 14: System Health ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Activity className="h-4 w-4 text-emerald-400" /> System Health — Cron Jobs
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {d.systemHealth.map(cron => (
            <div key={cron.cronJob} className="flex items-center gap-2 rounded-xl bg-secondary/30 p-3">
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cron.status === "ok" ? "bg-emerald-400 animate-pulse" : cron.status === "late" ? "bg-red-400" : "bg-gray-500"}`} />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-foreground truncate">{cron.cronJob}</p>
                <p className="text-[9px] text-muted-foreground">{cron.schedule}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── #4 Revenue Goal Progress ── */}
      {d.currentGoal && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Target className="h-4 w-4 text-indigo-400" /> Revenue Goal</h3>
            <Link href="/admin/goals" className="text-[10px] text-indigo-400 hover:underline">Manage Goals</Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm font-bold text-foreground">${d.mrr.toLocaleString()} / ${d.currentGoal.target_amount.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground capitalize">{d.currentGoal.period} MRR Goal</span>
              </div>
              <div className="h-3 rounded-full bg-secondary/50 overflow-hidden">
                <div className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all" style={{ width: `${Math.min(100, Math.round((d.mrr / d.currentGoal.target_amount) * 100))}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{Math.round((d.mrr / d.currentGoal.target_amount) * 100)}% achieved &middot; ${Math.max(0, d.currentGoal.target_amount - d.mrr).toLocaleString()} to go</p>
            </div>
          </div>
        </div>
      )}

      {/* ── #5 NPS Score ── */}
      {d.npsScore !== null && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Star className="h-4 w-4 text-amber-400" /> Net Promoter Score</h3>
            <Link href="/admin/nps" className="text-[10px] text-indigo-400 hover:underline">View Details</Link>
          </div>
          <div className="flex items-center gap-6">
            <div className={`text-4xl font-bold ${d.npsScore >= 50 ? "text-emerald-400" : d.npsScore >= 0 ? "text-amber-400" : "text-red-400"}`}>{d.npsScore}</div>
            <div className="text-xs text-muted-foreground">
              {d.npsScore >= 70 ? "Excellent — world class" : d.npsScore >= 50 ? "Great — strong loyalty" : d.npsScore >= 0 ? "Good — room to improve" : "Needs work — reach out to detractors"}
            </div>
          </div>
        </div>
      )}

      {/* ── #1 Dunning Stats ── */}
      {d.dunningStats.total > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Shield className="h-4 w-4 text-emerald-400" /> Payment Recovery (Dunning)</h3>
            <Link href="/admin/dunning" className="text-[10px] text-indigo-400 hover:underline">Manage</Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-secondary/30 p-3 text-center"><p className="text-lg font-bold text-foreground">{d.dunningStats.total}</p><p className="text-[9px] text-muted-foreground">Emails Sent</p></div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-center"><p className="text-lg font-bold text-emerald-400">{d.dunningStats.recovered}</p><p className="text-[9px] text-muted-foreground">Recovered</p></div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-center"><p className="text-lg font-bold text-emerald-400">${d.dunningStats.recoveredAmount}</p><p className="text-[9px] text-muted-foreground">Revenue Saved</p></div>
          </div>
        </div>
      )}

      {/* ── #2 Cancellation Reasons ── */}
      {Object.keys(d.cancellationReasons).length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><ClipboardCheck className="h-4 w-4 text-red-400" /> Why They Cancel</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(d.cancellationReasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
              <div key={reason} className="rounded-xl bg-secondary/30 p-3">
                <p className="text-sm font-bold text-foreground">{count}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{reason.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── #13 Revenue Breakdown by Source ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><PieChart className="h-4 w-4 text-violet-400" /> Revenue Breakdown</h3>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RPieChart>
                <Pie data={[
                  { name: "Monthly Subs", value: d.revenueBreakdown.monthlySubscriptions },
                  { name: "Annual Subs", value: d.revenueBreakdown.annualSubscriptions },
                  { name: "Team Add-ons", value: d.revenueBreakdown.teamAddons },
                  { name: "Reports", value: d.revenueBreakdown.reportPurchases },
                ].filter(x => x.value > 0)} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                  {["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b"].map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`$${v}`, ""]} />
              </RPieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            {[
              { label: "Monthly Subs", value: d.revenueBreakdown.monthlySubscriptions, color: "bg-indigo-500" },
              { label: "Annual Subs", value: d.revenueBreakdown.annualSubscriptions, color: "bg-violet-500" },
              { label: "Team Add-ons", value: d.revenueBreakdown.teamAddons, color: "bg-cyan-500" },
              { label: "Report Sales", value: d.revenueBreakdown.reportPurchases, color: "bg-amber-500" },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${r.color}`} />
                <div><p className="text-xs font-medium text-foreground">${r.value.toLocaleString()}</p><p className="text-[9px] text-muted-foreground">{r.label}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── #10 Pricing Experiment ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Receipt className="h-4 w-4 text-sky-400" /> Pricing Analysis</h3>
        <div className="grid grid-cols-2 gap-4">
          {(["monthly", "annual"] as const).map(plan => {
            const p = d.pricingExperiment[plan]
            return (
              <div key={plan} className="rounded-xl bg-secondary/30 p-4">
                <p className="text-xs font-bold uppercase text-foreground mb-2">{plan} — ${p.arpu}/mo</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><p className="text-muted-foreground">Total</p><p className="font-bold text-foreground">{p.total}</p></div>
                  <div><p className="text-muted-foreground">Active</p><p className="font-bold text-emerald-400">{p.active}</p></div>
                  <div><p className="text-muted-foreground">Trialing</p><p className="font-bold text-blue-400">{p.trialing}</p></div>
                  <div><p className="text-muted-foreground">Canceled</p><p className="font-bold text-red-400">{p.canceled}</p></div>
                </div>
                <div className="mt-2"><p className="text-[10px] text-muted-foreground">Conversion Rate</p><p className="text-sm font-bold text-indigo-400">{p.conversionRate}%</p></div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── #9 Seasonal Forecast ── */}
      {d.seasonalForecast.forecast.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><TrendingUp className="h-4 w-4 text-cyan-400" /> Revenue Forecast</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...d.monthlyRevenue.slice(-6).map(m => ({ month: m.month, actual: m.total })), ...d.seasonalForecast.forecast.map(f => ({ month: f.month, forecast: f.forecast }))]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 10 }} />
                <YAxis tick={{ fill: "#888", fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`$${v}`, ""]} />
                <Area type="monotone" dataKey="actual" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                <Area type="monotone" dataKey="forecast" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-1.5 w-4 rounded bg-indigo-500" /> Actual</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-4 rounded bg-cyan-500 opacity-50" style={{ borderTop: "1px dashed #22d3ee" }} /> Forecast</span>
          </div>
        </div>
      )}

      {/* ── #18 Trial Conversion Day-by-Day ── */}
      {d.trialActivity.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><BarChart3 className="h-4 w-4 text-blue-400" /> Trial Journey (Day-by-Day)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.trialActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: "#888", fontSize: 10 }} tickFormatter={v => `Day ${v}`} />
                <YAxis tick={{ fill: "#888", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="createdJob" name="Created Job" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="sentInvoice" name="Sent Invoice" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── #7 Onboarding Progress Per User ── */}
      {d.onboardingPerUser && d.onboardingPerUser.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><ClipboardCheck className="h-4 w-4 text-indigo-400" /> Onboarding Progress (Per Contractor)</h3>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {[...d.onboardingPerUser].sort((a, b) => a.pct - b.pct).map(u => (
              <div key={u.user_id} className={`flex items-center gap-3 rounded-xl p-3 ${u.pct < 50 && u.daysSinceSignup > 3 ? "bg-red-500/10 border border-red-500/20" : "bg-secondary/30"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-foreground truncate">{u.company_name || u.username}</p>
                    <span className="text-[10px] text-muted-foreground">{u.daysSinceSignup}d ago</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary/50">
                    <div className={`h-1.5 rounded-full transition-all ${u.pct >= 80 ? "bg-emerald-500" : u.pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${u.pct}%` }} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {u.steps.map(s => (
                      <span key={s.label} className={`rounded px-1.5 py-0.5 text-[8px] font-medium ${s.done ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary/50 text-muted-foreground"}`}>{s.done ? "\u2713" : "\u2717"} {s.label}</span>
                    ))}
                  </div>
                </div>
                <span className={`text-sm font-bold ${u.pct >= 80 ? "text-emerald-400" : u.pct >= 50 ? "text-amber-400" : "text-red-400"}`}>{u.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── #8 Recent Alerts ── */}
      {d.recentAlerts && d.recentAlerts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Bell className="h-4 w-4 text-amber-400" /> Recent Alerts</h3>
            <Link href="/admin/alerts" className="text-[10px] text-indigo-400 hover:underline">Manage Rules</Link>
          </div>
          <div className="flex flex-col gap-2">
            {d.recentAlerts.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-xs text-foreground">{a.message}</p>
                <span className="text-[10px] text-muted-foreground">{new Date(a.triggered_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Navigation Hub: All Feature Pages ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Owner Tools</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { href: "/admin/dunning", icon: Shield, label: "Dunning", desc: "Payment recovery", color: "text-emerald-400" },
            { href: "/admin/goals", icon: Target, label: "Goals", desc: "Revenue targets", color: "text-indigo-400" },
            { href: "/admin/alerts", icon: Bell, label: "Alerts", desc: "Custom rules", color: "text-amber-400" },
            { href: "/admin/changelog", icon: BookOpen, label: "Changelog", desc: "What's new feed", color: "text-purple-400" },
            { href: "/admin/tickets", icon: LifeBuoy, label: "Tickets", desc: "Support inbox", color: "text-blue-400" },
            { href: "/admin/competitors", icon: Swords, label: "Competitors", desc: "Battle cards", color: "text-red-400" },
            { href: "/admin/costs", icon: Receipt, label: "Unit Economics", desc: "Margins & costs", color: "text-teal-400" },
            { href: "/admin/investor", icon: BarChart3, label: "Investor Report", desc: "Growth metrics", color: "text-sky-400" },
            { href: "/admin/contractors", icon: Users, label: "Contractors", desc: "All accounts", color: "text-violet-400" },
            { href: "/admin/dashboard", icon: Megaphone, label: "Broadcast", desc: "Email all", color: "text-pink-400" },
          ].map(item => (
            <Link key={item.href + item.label} href={item.href} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 p-3 hover:bg-secondary/40 transition-colors">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <div>
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-[9px] text-muted-foreground">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Row 15: Quick Actions ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions — All Contractors</h3>
        <div className="flex flex-wrap gap-2">
          {d.engagement.map(e => {
            const sub = d.subscribers.find(s => s.user_id === e.user_id)
            return (
              <div key={e.user_id} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/20 px-3 py-2">
                <span className="text-xs text-foreground font-medium">{e.company_name || e.username}</span>
                {sub && <Badge status={sub.status} />}
                <div className="flex gap-1">
                  <a href={`mailto:${sub?.email || ""}`} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Email"><Mail className="h-3 w-3" /></a>
                  {sub?.stripe_customer_id && <a href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Stripe"><ExternalLink className="h-3 w-3" /></a>}
                  <a href={`/admin/impersonate?id=${e.user_id}`} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="View as this contractor"><Eye className="h-3 w-3" /></a>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
