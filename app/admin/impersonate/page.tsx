"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { authFetch } from "@/lib/auth-fetch"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"
import {
  ArrowLeft, Eye, User, FileText, Layers, DollarSign, BarChart3,
  Mail, Phone, Calendar, CreditCard, Users, MessageSquare,
  Clock, AlertTriangle, CheckCircle, XCircle, ExternalLink,
  Send, Shield, Star, Activity, ChevronDown, ChevronRight,
  Receipt, ClipboardList, Zap
} from "lucide-react"

type ContractorData = {
  profile: any
  subscription: any
  jobCount: number
  invoiceCount: number
  reportCount: number
  recentJobs: any[]
  recentInvoices: any[]
  recentReports: any[]
  customers: any[]
  teamMembers: any[]
  churnScore: any
  recentActivity: any[]
  supportTickets: any[]
  expenses: any[]
  totalRevenue: number
  pendingInvoiceTotal: number
}

export default function ImpersonatePage() {
  const params = useSearchParams()
  const contractorId = params.get("id")
  const [data, setData] = useState<ContractorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["profile", "stats", "jobs"]))
  const [actionLoading, setActionLoading] = useState("")
  const [actionMessage, setActionMessage] = useState("")

  const toggleSection = (s: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s); else next.add(s)
      return next
    })
  }

  useEffect(() => {
    if (!contractorId) { setLoading(false); return }

    const fetchData = async () => {
      try {
        const res = await authFetch(`/api/admin/impersonate?id=${contractorId}`)
        if (!res.ok) { setLoading(false); return }
        const d = await res.json()
        setData(d)
      } catch (err) {
        console.error("Failed to load contractor data:", err)
      }
      setLoading(false)
    }

    fetchData()
  }, [contractorId])

  const handleAction = async (action: string) => {
    setActionLoading(action)
    setActionMessage("")
    try {
      if (action === "extend_trial") {
        const newEnd = new Date()
        newEnd.setDate(newEnd.getDate() + 7)
        await supabase.from("subscriptions").update({
          current_period_end: newEnd.toISOString()
        }).eq("user_id", contractorId)
        setActionMessage("Trial extended by 7 days")
      } else if (action === "send_email") {
        const email = data?.profile?.email
        if (email) window.open(`mailto:${email}`, "_blank")
      } else if (action === "view_stripe") {
        const stripeId = data?.subscription?.stripe_customer_id || data?.profile?.stripe_customer_id
        if (stripeId) window.open(`https://dashboard.stripe.com/customers/${stripeId}`, "_blank")
      }
    } catch (err) {
      console.error("Action failed:", err)
      setActionMessage("Action failed")
    }
    setActionLoading("")
  }

  if (!contractorId) return <p className="p-6 text-muted-foreground">No contractor ID provided.</p>
  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
  if (!data?.profile) return <p className="p-6 text-red-400">Contractor not found.</p>

  const p = data.profile
  const sub = data.subscription
  const churn = data.churnScore

  const statusColor = (s: string) => {
    if (s === "active") return "bg-emerald-500/15 text-emerald-400"
    if (s === "trialing") return "bg-blue-500/15 text-blue-400"
    if (s === "past_due") return "bg-amber-500/15 text-amber-400"
    if (s === "canceled") return "bg-red-500/15 text-red-400"
    return "bg-gray-500/15 text-gray-400"
  }

  const churnColor = churn?.risk_level === "high" ? "text-red-400 bg-red-500/15" : churn?.risk_level === "medium" ? "text-amber-400 bg-amber-500/15" : "text-emerald-400 bg-emerald-500/15"

  const TABS = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "jobs", label: `Jobs (${data.jobCount})`, icon: Layers },
    { id: "invoices", label: `Invoices (${data.invoiceCount})`, icon: DollarSign },
    { id: "customers", label: `Customers (${data.customers.length})`, icon: Users },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "support", label: "Support", icon: MessageSquare },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="rounded-lg border border-border bg-secondary/30 p-2 hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
              {p.logo_url ? (
                <img src={p.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                {p.company_name || p.username}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{p.email}</span>
                {p.phone && <><span>·</span><span>{p.phone}</span></>}
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleAction("send_email")} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
            <Mail className="h-3.5 w-3.5" /> Email
          </button>
          {p.phone && (
            <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
              <Phone className="h-3.5 w-3.5" /> Call
            </a>
          )}
          <button onClick={() => handleAction("view_stripe")} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
            <CreditCard className="h-3.5 w-3.5" /> Stripe
          </button>
          {sub?.status === "trialing" && (
            <button onClick={() => handleAction("extend_trial")} disabled={actionLoading === "extend_trial"} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Clock className="h-3.5 w-3.5" /> {actionLoading === "extend_trial" ? "Extending..." : "Extend Trial +7d"}
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-xs text-emerald-400">
          <CheckCircle className="mr-1 inline h-3 w-3" /> {actionMessage}
        </div>
      )}

      {/* Top cards row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {/* Subscription */}
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Subscription</p>
          {sub ? (
            <>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(sub.status)}`}>{sub.status}</span>
              <p className="text-xs text-muted-foreground mt-1">{sub.plan || "monthly"} plan</p>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No subscription</span>
          )}
        </div>

        {/* MRR */}
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Their MRR</p>
          <p className="text-lg font-bold text-foreground">
            ${sub?.status === "active" ? (sub.plan === "annual" ? 169 : 199) + (data.teamMembers.filter(t => t.status === "active").length * 39) : 0}
          </p>
        </div>

        {/* Churn risk */}
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Churn Risk</p>
          {churn ? (
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${churnColor}`}>
              {churn.score}/100 — {churn.risk_level}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Not scored</span>
          )}
        </div>

        {/* Jobs */}
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Jobs</p>
          <p className="text-lg font-bold text-foreground">{data.jobCount}</p>
        </div>

        {/* Revenue collected */}
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Revenue Collected</p>
          <p className="text-lg font-bold text-emerald-400">${data.totalRevenue.toLocaleString()}</p>
        </div>

        {/* Pending */}
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pending Invoices</p>
          <p className="text-lg font-bold text-amber-400">${data.pendingInvoiceTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4">
          {/* Profile details */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <User className="h-4 w-4" /> Profile Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
              <div><p className="text-muted-foreground">Username</p><p className="font-medium text-foreground">{p.username || "—"}</p></div>
              <div><p className="text-muted-foreground">Company</p><p className="font-medium text-foreground">{p.company_name || "—"}</p></div>
              <div><p className="text-muted-foreground">Email</p><p className="font-medium text-foreground">{p.email || "—"}</p></div>
              <div><p className="text-muted-foreground">Phone</p><p className="font-medium text-foreground">{p.phone || "—"}</p></div>
              <div><p className="text-muted-foreground">Service Zips</p><p className="font-medium text-foreground">{(p.service_zips || []).join(", ") || "—"}</p></div>
              <div><p className="text-muted-foreground">License</p><p className="font-medium text-foreground">{p.license_number || "—"}</p></div>
              <div><p className="text-muted-foreground">Stripe Connect</p><p className="font-medium text-foreground">{p.stripe_connect_account_id ? "Connected" : "Not connected"}</p></div>
              <div><p className="text-muted-foreground">Joined</p><p className="font-medium text-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</p></div>
              <div><p className="text-muted-foreground">Google Calendar</p><p className="font-medium text-foreground">{p.google_calendar_connected ? "Connected" : "Not connected"}</p></div>
              <div><p className="text-muted-foreground">QuickBooks</p><p className="font-medium text-foreground">{p.quickbooks_connected ? "Connected" : "Not connected"}</p></div>
              <div><p className="text-muted-foreground">Onboarding</p><p className="font-medium text-foreground">{p.onboarding_completed ? "Completed" : "Not completed"}</p></div>
              <div><p className="text-muted-foreground">Attribution</p><p className="font-medium text-foreground">{p.attribution_source || "organic"}</p></div>
            </div>
          </div>

          {/* Subscription details */}
          {sub && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <CreditCard className="h-4 w-4" /> Subscription
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                <div><p className="text-muted-foreground">Status</p><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(sub.status)}`}>{sub.status}</span></div>
                <div><p className="text-muted-foreground">Plan</p><p className="font-medium text-foreground">{sub.plan || "monthly"}</p></div>
                <div><p className="text-muted-foreground">Started</p><p className="font-medium text-foreground">{sub.created_at ? new Date(sub.created_at).toLocaleDateString() : "—"}</p></div>
                <div><p className="text-muted-foreground">Period End</p><p className="font-medium text-foreground">{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "—"}</p></div>
                <div><p className="text-muted-foreground">Stripe Customer</p>
                  {sub.stripe_customer_id ? (
                    <a href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`} target="_blank" rel="noopener" className="font-medium text-primary hover:underline flex items-center gap-1">
                      {sub.stripe_customer_id.slice(0, 18)}... <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : <p className="font-medium text-muted-foreground">—</p>}
                </div>
                <div><p className="text-muted-foreground">Stripe Sub ID</p><p className="font-medium text-foreground text-[10px]">{sub.stripe_subscription_id || "—"}</p></div>
              </div>
            </div>
          )}

          {/* Team members */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-4 w-4" /> Team ({data.teamMembers.length} members)
            </h3>
            {data.teamMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No team members</p>
            ) : (
              <div className="space-y-2">
                {data.teamMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-xs">
                    <div>
                      <span className="font-medium text-foreground">{m.invited_name || m.invited_email}</span>
                      <span className="ml-2 text-muted-foreground">{m.invited_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{m.role}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{m.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Churn factors */}
          {churn?.factors && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <AlertTriangle className="h-4 w-4" /> Churn Risk Factors
              </h3>
              <div className="space-y-2">
                {(Array.isArray(churn.factors) ? churn.factors : []).map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-xs">
                    <span className="text-foreground">{f.detail}</span>
                    <span className="font-bold text-red-400">+{f.points} pts</span>
                  </div>
                ))}
                {(!churn.factors || (Array.isArray(churn.factors) && churn.factors.length === 0)) && (
                  <p className="text-xs text-emerald-400">No risk factors detected</p>
                )}
              </div>
            </div>
          )}

          {/* Estimates */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-4 w-4" /> Recent Estimates ({data.reportCount} total)
            </h3>
            {data.recentReports.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No estimates</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Customer</th>
                    <th className="pb-2 pr-4 font-medium">Accepted</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr></thead>
                  <tbody>{data.recentReports.map(r => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium text-foreground">{r.customer_name || "—"}</td>
                      <td className="py-2 pr-4">
                        {r.estimate_accepted ? (
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "jobs" && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">All Jobs</h3>
          {data.recentJobs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No jobs</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Customer</th>
                  <th className="pb-2 pr-4 font-medium">Address</th>
                  <th className="pb-2 pr-4 font-medium">Budget</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr></thead>
                <tbody>{data.recentJobs.map(j => (
                  <tr key={j.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{j.customer_name || "—"}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground max-w-[200px] truncate">{j.address || "—"}</td>
                    <td className="py-2.5 pr-4 font-medium text-foreground">{j.budget ? `$${Number(j.budget).toLocaleString()}` : "—"}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        j.status === "Completed" ? "bg-emerald-500/15 text-emerald-400" :
                        j.status === "In Progress" ? "bg-blue-500/15 text-blue-400" :
                        j.status === "Scheduled" ? "bg-purple-500/15 text-purple-400" :
                        "bg-gray-500/15 text-gray-400"
                      }`}>{j.status}</span>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{new Date(j.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Invoices</h3>
          {data.recentInvoices.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No invoices</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Customer</th>
                  <th className="pb-2 pr-4 font-medium">Amount</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr></thead>
                <tbody>{data.recentInvoices.map(inv => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{inv.customer_name || "—"}</td>
                    <td className="py-2.5 pr-4 font-bold text-foreground">${Number(inv.amount || 0).toLocaleString()}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        inv.status === "paid" ? "bg-emerald-500/15 text-emerald-400" :
                        inv.status === "sent" ? "bg-amber-500/15 text-amber-400" :
                        inv.status === "draft" ? "bg-gray-500/15 text-gray-400" :
                        "bg-red-500/15 text-red-400"
                      }`}>{inv.status}</span>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "customers" && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Customers</h3>
          {data.customers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No customers</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Phone</th>
                  <th className="pb-2 font-medium">Added</th>
                </tr></thead>
                <tbody>{data.customers.map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{c.name || "—"}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{c.email || "—"}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{c.phone || "—"}</td>
                    <td className="py-2.5 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "activity" && (
        <div className="flex flex-col gap-4">
          {/* Document events timeline */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
            {data.recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No activity</p>
            ) : (
              <div className="space-y-2">
                {data.recentActivity.map(a => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg bg-secondary/20 px-3 py-2 text-xs">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      a.event_type === "sent" ? "bg-blue-500/15" :
                      a.event_type === "opened" ? "bg-amber-500/15" :
                      a.event_type === "signed" || a.event_type === "paid" ? "bg-emerald-500/15" :
                      "bg-gray-500/15"
                    }`}>
                      {a.event_type === "sent" ? <Send className="h-3 w-3 text-blue-400" /> :
                       a.event_type === "opened" ? <Eye className="h-3 w-3 text-amber-400" /> :
                       a.event_type === "paid" ? <DollarSign className="h-3 w-3 text-emerald-400" /> :
                       a.event_type === "signed" ? <CheckCircle className="h-3 w-3 text-emerald-400" /> :
                       <Activity className="h-3 w-3 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground capitalize">{a.document_type}</span>
                      <span className="text-muted-foreground"> {a.event_type}</span>
                      {a.recipient_email && <span className="text-muted-foreground"> to {a.recipient_email}</span>}
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expenses */}
          {data.expenses.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Receipt className="inline h-4 w-4 mr-1" /> Expenses
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Vendor</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr></thead>
                  <tbody>{data.expenses.map(e => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium text-foreground">{e.vendor || "—"}</td>
                      <td className="py-2 pr-4 text-foreground">${Number(e.amount).toLocaleString()}</td>
                      <td className="py-2 pr-4"><span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{e.category}</span></td>
                      <td className="py-2 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "support" && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Support Tickets</h3>
          {data.supportTickets.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No support tickets</p>
          ) : (
            <div className="space-y-2">
              {data.supportTickets.map(t => (
                <Link key={t.id} href={`/admin/tickets?id=${t.id}`} className="flex items-center justify-between rounded-lg bg-secondary/20 px-3 py-3 text-xs hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${t.status === "open" ? "bg-amber-400" : t.status === "resolved" ? "bg-emerald-400" : "bg-gray-400"}`} />
                    <span className="font-medium text-foreground">{t.subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.status === "open" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>{t.status}</span>
                    <span className="text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
