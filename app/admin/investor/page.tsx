"use client"

import { useEffect, useState } from "react"
import { authFetch } from "@/lib/auth-fetch"
import Link from "next/link"
import {
  ArrowLeft, DollarSign, TrendingUp, Users, Activity,
  Copy, Printer, Check, BarChart3, Percent, Clock,
  UserCheck, Zap, Heart,
} from "lucide-react"

type MonthlyRevenue = {
  month: string
  subscriptions: number
  reports: number
  total: number
}

type InvestorReport = {
  mrr: number
  mrr_growth_rate: number
  arr: number
  churn_rate: number
  average_ltv: number
  nrr: number
  arpu: number
  total_contractors: number
  active_subs: number
  trials: number
  monthly_revenue: MonthlyRevenue[]
}

export default function InvestorPage() {
  const [data, setData] = useState<InvestorReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    authFetch("/api/admin/investor-report")
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(setData)
      .catch(() => setError("Failed to load investor report"))
      .finally(() => setLoading(false))
  }, [])

  const handleCopyJson = () => {
    if (!data) return
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" /></div>
  if (error || !data) return <p className="p-6 text-red-400">{error || "Failed to load"}</p>

  const metrics = [
    { label: "Monthly Recurring Revenue", value: `$${data.mrr.toLocaleString()}`, icon: DollarSign, color: "bg-emerald-900/30 text-emerald-400" },
    { label: "MRR Growth Rate", value: `${data.mrr_growth_rate}%`, icon: TrendingUp, color: data.mrr_growth_rate >= 0 ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400" },
    { label: "Annual Recurring Revenue", value: `$${data.arr.toLocaleString()}`, icon: BarChart3, color: "bg-indigo-900/30 text-indigo-400" },
    { label: "Churn Rate", value: `${data.churn_rate}%`, icon: Activity, color: data.churn_rate <= 5 ? "bg-emerald-900/30 text-emerald-400" : "bg-amber-900/30 text-amber-400" },
    { label: "Average LTV", value: `$${data.average_ltv.toLocaleString()}`, icon: Heart, color: "bg-pink-900/30 text-pink-400" },
    { label: "Net Revenue Retention", value: `${data.nrr}%`, icon: Percent, color: data.nrr >= 100 ? "bg-emerald-900/30 text-emerald-400" : "bg-amber-900/30 text-amber-400" },
    { label: "ARPU", value: `$${data.arpu.toLocaleString()}`, icon: Zap, color: "bg-purple-900/30 text-purple-400" },
    { label: "Total Contractors", value: data.total_contractors.toString(), icon: Users, color: "bg-blue-900/30 text-blue-400" },
    { label: "Active Subscribers", value: data.active_subs.toString(), icon: UserCheck, color: "bg-indigo-900/30 text-indigo-400" },
    { label: "Trials", value: data.trials.toString(), icon: Clock, color: "bg-sky-900/30 text-sky-400" },
  ]

  return (
    <>
      {/* Print-friendly styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-card { border: 1px solid #ddd !important; background: white !important; break-inside: avoid; }
          .print-card * { color: black !important; }
          .print-heading { color: #4f46e5 !important; background: white !important; border: 2px solid #4f46e5 !important; }
          .print-heading * { color: #4f46e5 !important; }
          .print-heading .text-white { color: #4f46e5 !important; }
          .print-heading .text-indigo-100 { color: #666 !important; }
        }
      `}</style>

      <div className="flex flex-col gap-5">
        {/* Back */}
        <Link href="/admin/dashboard" className="no-print flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="print-heading relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 p-6 shadow-lg">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 no-print" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>Investor Dashboard</h2>
              <p className="mt-1 text-sm text-indigo-100">XRoof SaaS Metrics — {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            </div>
            <div className="no-print flex gap-2">
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy as JSON"}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map(m => (
            <div key={m.label} className="print-card rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${m.color}`}>
                <m.icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-xl font-bold text-foreground">{m.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Monthly Revenue Table */}
        <div className="print-card rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Monthly Revenue</h3>
          {(data.monthly_revenue || []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No revenue data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Month</th>
                    <th className="pb-2 pr-4 font-medium text-right">Subscriptions</th>
                    <th className="pb-2 pr-4 font-medium text-right">Reports</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly_revenue.map((row, i) => (
                    <tr key={row.month} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                      <td className="py-2.5 pr-4 font-medium text-foreground">{row.month}</td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground">${row.subscriptions.toLocaleString()}</td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground">${row.reports.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-medium text-emerald-400">${row.total.toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="border-t-2 border-border">
                    <td className="py-2.5 pr-4 font-bold text-foreground">Total</td>
                    <td className="py-2.5 pr-4 text-right font-bold text-muted-foreground">
                      ${data.monthly_revenue.reduce((s, r) => s + r.subscriptions, 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-bold text-muted-foreground">
                      ${data.monthly_revenue.reduce((s, r) => s + r.reports, 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-bold text-emerald-400">
                      ${data.monthly_revenue.reduce((s, r) => s + r.total, 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Key highlights for investors */}
        <div className="print-card rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Key Highlights</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl bg-secondary/30 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400 flex-shrink-0">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Revenue Run Rate</p>
                <p className="text-[10px] text-muted-foreground">ARR of ${data.arr.toLocaleString()} based on current MRR of ${data.mrr.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-secondary/30 p-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${data.nrr >= 100 ? "bg-emerald-900/30 text-emerald-400" : "bg-amber-900/30 text-amber-400"}`}>
                <Percent className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Net Revenue Retention</p>
                <p className="text-[10px] text-muted-foreground">{data.nrr >= 100 ? "Above 100% — expanding from existing base" : "Below 100% — some contraction in existing base"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-secondary/30 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-900/30 text-pink-400 flex-shrink-0">
                <Heart className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Customer Lifetime Value</p>
                <p className="text-[10px] text-muted-foreground">Average LTV of ${data.average_ltv.toLocaleString()} per contractor</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-secondary/30 p-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${data.churn_rate <= 5 ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"}`}>
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Churn Rate</p>
                <p className="text-[10px] text-muted-foreground">{data.churn_rate}% monthly churn — {data.churn_rate <= 5 ? "healthy for vertical SaaS" : "above target, needs attention"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
