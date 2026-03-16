"use client"

import { useEffect, useState, useMemo } from "react"
import { authFetch } from "@/lib/auth-fetch"
import {
  DollarSign, Users, Clock, TrendingUp, AlertTriangle, Activity,
  ChevronDown, ChevronRight, ExternalLink, Mail, Download, BarChart3,
  UserCheck, UserX, Zap, ArrowRight,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"

type Subscriber = {
  user_id: string; username: string; company_name: string; email: string
  plan: string; status: string; stripe_customer_id: string
  current_period_end: string; team_member_count: number; mrr_contribution: number
}
type Trial = {
  user_id: string; username: string; company_name: string; email: string
  plan: string; trial_ends: string; days_remaining: number; expiring_soon: boolean
}
type Churned = {
  user_id: string; username: string; company_name: string; plan: string
  canceled_date: string; was_subscribed_days: number
}
type PastDue = {
  user_id: string; username: string; company_name: string; email: string
  plan: string; stripe_customer_id: string; days_past_due: number
}
type Engagement = {
  user_id: string; username: string; company_name: string
  last_job_created: string | null; last_invoice_sent: string | null
  score: "active" | "idle" | "dormant"
}
type ActivityItem = { type: string; description: string; timestamp: string }
type Analytics = {
  mrr: number; activeSubscribers: number; trialingCount: number
  totalLifetimeRevenue: number; projectedAnnualRevenue: number
  churnRate: number; totalContractors: number
  subscribers: Subscriber[]; trials: Trial[]; churned: Churned[]
  pastDue: PastDue[]; engagement: Engagement[]
  recentActivity: ActivityItem[]
  monthlyRevenue: { month: string; subscriptions: number; reports: number; total: number }[]
  onboardingFunnel: { signed_up: number; created_job: number; sent_invoice: number; got_paid: number }
  platformStats: { totalJobs: number; totalInvoices: number; totalInvoicesPaid: number; totalReports: number }
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  trialing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  past_due: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  canceled: "bg-red-500/15 text-red-400 border-red-500/30",
}

const ENGAGEMENT_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  idle: "bg-amber-500/15 text-amber-400",
  dormant: "bg-red-500/15 text-red-400",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[status] || "bg-muted text-muted-foreground border-border"}`}>
      {status.replace("_", " ")}
    </span>
  )
}

function MetricCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

function exportCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return
  const keys = Object.keys(data[0])
  const csv = [keys.join(","), ...data.map(row => keys.map(k => `"${row[k] ?? ""}"`).join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [subSort, setSubSort] = useState<"mrr" | "status">("mrr")

  useEffect(() => {
    authFetch("/api/analytics/admin")
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized")
        return res.json()
      })
      .then(setData)
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false))
  }, [])

  const sortedSubscribers = useMemo(() => {
    if (!data) return []
    const list = [...data.subscribers]
    if (subSort === "mrr") list.sort((a, b) => b.mrr_contribution - a.mrr_contribution)
    else list.sort((a, b) => {
      const order: Record<string, number> = { active: 0, trialing: 1, past_due: 2, canceled: 3 }
      return (order[a.status] ?? 4) - (order[b.status] ?? 4)
    })
    return list
  }, [data, subSort])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return <p className="p-6 text-red-400">{error || "Failed to load"}</p>
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
          XRoof Owner Portal
        </h2>
        <p className="mt-1 text-sm text-indigo-100">Platform overview &middot; {today}</p>
      </div>

      {/* Row 1 — Key metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard
          label="MRR" value={`$${data.mrr.toLocaleString()}`}
          sub="Monthly Recurring Revenue"
          icon={DollarSign} color="bg-emerald-900/30 text-emerald-400"
        />
        <MetricCard
          label="Active Subscribers" value={data.activeSubscribers.toString()}
          icon={UserCheck} color="bg-indigo-900/30 text-indigo-400"
        />
        <MetricCard
          label="Free Trials" value={data.trialingCount.toString()}
          sub={data.trials.filter(t => t.expiring_soon).length > 0 ? `${data.trials.filter(t => t.expiring_soon).length} expiring soon` : undefined}
          icon={Clock} color="bg-blue-900/30 text-blue-400"
        />
        <MetricCard
          label="Lifetime Revenue" value={`$${Math.round(data.totalLifetimeRevenue).toLocaleString()}`}
          icon={TrendingUp} color="bg-purple-900/30 text-purple-400"
        />
        <MetricCard
          label="Projected Annual" value={`$${data.projectedAnnualRevenue.toLocaleString()}`}
          sub="Based on current MRR + 60% trial conversion"
          icon={BarChart3} color="bg-sky-900/30 text-sky-400"
        />
      </div>

      {/* Row 2 — Revenue chart */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Revenue — Last 12 Months</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} />
              <YAxis tick={{ fill: "#888", fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`$${v.toLocaleString()}`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="subscriptions" name="Subscriptions" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="reports" name="Reports" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3 — Subscribers table */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Subscribers</h3>
          <div className="flex gap-2">
            <button onClick={() => setSubSort("mrr")} className={`rounded-lg px-3 py-1 text-xs font-medium ${subSort === "mrr" ? "bg-indigo-500/20 text-indigo-400" : "text-muted-foreground hover:bg-secondary"}`}>Sort by MRR</button>
            <button onClick={() => setSubSort("status")} className={`rounded-lg px-3 py-1 text-xs font-medium ${subSort === "status" ? "bg-indigo-500/20 text-indigo-400" : "text-muted-foreground hover:bg-secondary"}`}>Sort by Status</button>
            <button onClick={() => exportCSV(data.subscribers, "xroof-subscribers.csv")} className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary">
              <Download className="h-3 w-3" /> CSV
            </button>
          </div>
        </div>
        {sortedSubscribers.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No subscribers yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium"></th>
                  <th className="pb-2 pr-4 font-medium">Contractor</th>
                  <th className="pb-2 pr-4 font-medium">Plan</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Period End</th>
                  <th className="pb-2 pr-4 font-medium">Team</th>
                  <th className="pb-2 pr-4 font-medium">MRR</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSubscribers.map(sub => (
                  <tr key={sub.user_id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-3 pr-2">
                      <button onClick={() => setExpandedRow(expandedRow === sub.user_id ? null : sub.user_id)}>
                        {expandedRow === sub.user_id ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      </button>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-foreground">{sub.company_name || sub.username}</p>
                      <p className="text-[10px] text-muted-foreground">{sub.email}</p>
                    </td>
                    <td className="py-3 pr-4 capitalize">{sub.plan}</td>
                    <td className="py-3 pr-4"><StatusBadge status={sub.status} /></td>
                    <td className="py-3 pr-4 text-muted-foreground">{new Date(sub.current_period_end).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">{sub.team_member_count}</td>
                    <td className="py-3 pr-4 font-medium text-emerald-400">${sub.mrr_contribution}</td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {sub.stripe_customer_id && (
                          <a
                            href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`}
                            target="_blank" rel="noopener noreferrer"
                            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="View in Stripe"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {sub.email && (
                          <a href={`mailto:${sub.email}`} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Email contractor">
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 4 — Trials expiring soon + Past due */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Trials */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-4 w-4 text-blue-400" /> Free Trials ({data.trials.length})
          </h3>
          {data.trials.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No active trials</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.trials.map(t => (
                <div key={t.user_id} className={`flex items-center justify-between rounded-xl p-3 ${t.expiring_soon ? "bg-amber-500/10 border border-amber-500/30" : "bg-secondary/30"}`}>
                  <div>
                    <p className="text-xs font-medium text-foreground">{t.company_name || t.username}</p>
                    <p className="text-[10px] text-muted-foreground">{t.email}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${t.expiring_soon ? "text-amber-400" : "text-blue-400"}`}>
                      {t.days_remaining}d left
                    </p>
                    {t.expiring_soon && <p className="text-[9px] text-amber-400">Expiring soon!</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past due */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Payment Failures ({data.pastDue.length})
          </h3>
          {data.pastDue.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No failed payments</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.pastDue.map(p => (
                <div key={p.user_id} className="flex items-center justify-between rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                  <div>
                    <p className="text-xs font-medium text-foreground">{p.company_name || p.username}</p>
                    <p className="text-[10px] text-muted-foreground">{p.email} &middot; {p.days_past_due}d overdue</p>
                  </div>
                  {p.stripe_customer_id && (
                    <a
                      href={`https://dashboard.stripe.com/customers/${p.stripe_customer_id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="rounded-lg bg-amber-500/20 px-2 py-1 text-[10px] font-medium text-amber-400 hover:bg-amber-500/30"
                    >
                      Fix in Stripe
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 5 — Churn tracking */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <UserX className="h-4 w-4 text-red-400" /> Churn
          </h3>
          <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-400">
            {data.churnRate}% this month
          </span>
        </div>
        {data.churned.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No cancellations</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Contractor</th>
                  <th className="pb-2 pr-4 font-medium">Plan</th>
                  <th className="pb-2 pr-4 font-medium">Canceled</th>
                  <th className="pb-2 font-medium">Was Subscribed</th>
                </tr>
              </thead>
              <tbody>
                {data.churned.map(c => (
                  <tr key={c.user_id} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium text-foreground">{c.company_name || c.username}</td>
                    <td className="py-2 pr-4 capitalize">{c.plan}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{new Date(c.canceled_date).toLocaleDateString()}</td>
                    <td className="py-2 text-muted-foreground">{c.was_subscribed_days}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 6 — Onboarding funnel */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Zap className="h-4 w-4 text-indigo-400" /> Onboarding Funnel
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "Signed Up", value: data.onboardingFunnel.signed_up },
            { label: "Created Job", value: data.onboardingFunnel.created_job },
            { label: "Sent Invoice", value: data.onboardingFunnel.sent_invoice },
            { label: "Got Paid", value: data.onboardingFunnel.got_paid },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className="rounded-xl bg-indigo-500/10 px-4 py-3 text-center">
                <p className="text-xl font-bold text-indigo-400">{step.value}</p>
                <p className="text-[10px] text-muted-foreground">{step.label}</p>
              </div>
              {i < arr.length - 1 && (
                <div className="flex flex-col items-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  <span className="text-[9px] text-muted-foreground/50">
                    {step.value > 0 ? `${Math.round((arr[i + 1].value / step.value) * 100)}%` : "—"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Row 7 — Engagement + Activity side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Engagement */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-4 w-4 text-indigo-400" /> Contractor Engagement
          </h3>
          <div className="mb-3 flex gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Active ({data.engagement.filter(e => e.score === "active").length})</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Idle ({data.engagement.filter(e => e.score === "idle").length})</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Dormant ({data.engagement.filter(e => e.score === "dormant").length})</span>
          </div>
          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
            {data.engagement.sort((a, b) => {
              const order = { dormant: 0, idle: 1, active: 2 }
              return (order[a.score] ?? 3) - (order[b.score] ?? 3)
            }).map(e => (
              <div key={e.user_id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary/30">
                <p className="text-xs text-foreground">{e.company_name || e.username}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${ENGAGEMENT_COLORS[e.score]}`}>{e.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {data.recentActivity.map((a, i) => {
              const colors: Record<string, string> = {
                signup: "text-indigo-400", purchase: "text-purple-400",
                team: "text-blue-400", churn: "text-red-400",
              }
              return (
                <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-secondary/30">
                  <span className={`mt-0.5 text-[10px] font-bold uppercase ${colors[a.type] || "text-muted-foreground"}`}>{a.type}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground">{a.description}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(a.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 8 — Platform stats */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Platform Stats</h3>
          <button
            onClick={() => exportCSV([{
              total_contractors: data.totalContractors,
              active_subscribers: data.activeSubscribers,
              mrr: data.mrr,
              ...data.platformStats,
            }], "xroof-platform-stats.csv")}
            className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
          >
            <Download className="h-3 w-3" /> Export
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Total Contractors", value: data.totalContractors },
            { label: "Total Jobs", value: data.platformStats.totalJobs },
            { label: "Invoices Sent", value: data.platformStats.totalInvoices },
            { label: "Invoices Paid", value: data.platformStats.totalInvoicesPaid },
            { label: "Reports Generated", value: data.platformStats.totalReports },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-secondary/30 p-3 text-center">
              <p className="text-lg font-bold text-foreground">{s.value.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
