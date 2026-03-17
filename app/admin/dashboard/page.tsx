"use client"

import { useEffect, useState, useMemo } from "react"
import { authFetch } from "@/lib/auth-fetch"
import {
  DollarSign, Users, Clock, TrendingUp, TrendingDown, AlertTriangle, Activity,
  ChevronDown, ChevronRight, ExternalLink, Mail, Download, BarChart3,
  UserCheck, UserX, Zap, ArrowRight, ArrowUp, ArrowDown, FileText,
  Globe, MessageSquare, Camera, Send, Timer, Trophy, Layers, MapPin,
  Heart, Minus, Eye,
} from "lucide-react"
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Line,
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

      {/* ── Row 15: Quick Actions ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {d.subscribers.filter(s => s.status === "active" || s.status === "trialing").map(s => (
            <div key={s.user_id} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/20 px-3 py-2">
              <span className="text-xs text-foreground font-medium">{s.company_name || s.username}</span>
              <div className="flex gap-1">
                {s.email && <a href={`mailto:${s.email}`} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Email"><Mail className="h-3 w-3" /></a>}
                {s.stripe_customer_id && <a href={`https://dashboard.stripe.com/customers/${s.stripe_customer_id}`} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Stripe"><ExternalLink className="h-3 w-3" /></a>}
                <a href={`/admin/impersonate?id=${s.user_id}`} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="View as this contractor"><Eye className="h-3 w-3" /></a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
