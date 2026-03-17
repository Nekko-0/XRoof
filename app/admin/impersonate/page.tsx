"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"
import { ArrowLeft, Eye, User, FileText, Layers, DollarSign, BarChart3 } from "lucide-react"

type ContractorData = {
  profile: any
  jobCount: number
  invoiceCount: number
  reportCount: number
  recentJobs: any[]
}

export default function ImpersonatePage() {
  const params = useSearchParams()
  const contractorId = params.get("id")
  const [data, setData] = useState<ContractorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contractorId) { setLoading(false); return }

    const fetchData = async () => {
      const [
        { data: profile },
        { count: jobCount },
        { count: invoiceCount },
        { count: reportCount },
        { data: recentJobs },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", contractorId).single(),
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("contractor_id", contractorId),
        supabase.from("invoices").select("*", { count: "exact", head: true }).eq("contractor_id", contractorId),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("contractor_id", contractorId),
        supabase.from("jobs").select("id, customer_name, address, status, created_at").eq("contractor_id", contractorId).order("created_at", { ascending: false }).limit(10),
      ])

      setData({
        profile,
        jobCount: jobCount || 0,
        invoiceCount: invoiceCount || 0,
        reportCount: reportCount || 0,
        recentJobs: recentJobs || [],
      })
      setLoading(false)
    }

    fetchData()
  }, [contractorId])

  if (!contractorId) return <p className="p-6 text-muted-foreground">No contractor ID provided.</p>
  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" /></div>
  if (!data?.profile) return <p className="p-6 text-red-400">Contractor not found.</p>

  const p = data.profile

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard" className="rounded-lg border border-border bg-secondary/30 p-2 hover:bg-secondary"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
            <Eye className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Viewing: {p.company_name || p.username}
            </h2>
            <p className="text-xs text-muted-foreground">Read-only view of contractor&apos;s data</p>
          </div>
        </div>
      </div>

      {/* Warning banner */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <p className="text-xs font-medium text-amber-300">
          <Eye className="mr-1 inline h-3 w-3" />
          You are viewing {p.company_name || p.username}&apos;s data in read-only mode. No changes can be made from here.
        </p>
      </div>

      {/* Profile info */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><User className="h-4 w-4" /> Profile</h3>
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div><p className="text-muted-foreground">Username</p><p className="font-medium text-foreground">{p.username || "—"}</p></div>
          <div><p className="text-muted-foreground">Company</p><p className="font-medium text-foreground">{p.company_name || "—"}</p></div>
          <div><p className="text-muted-foreground">Email</p><p className="font-medium text-foreground">{p.email || "—"}</p></div>
          <div><p className="text-muted-foreground">Phone</p><p className="font-medium text-foreground">{p.phone || "—"}</p></div>
          <div><p className="text-muted-foreground">Service Zips</p><p className="font-medium text-foreground">{(p.service_zips || []).join(", ") || "—"}</p></div>
          <div><p className="text-muted-foreground">License</p><p className="font-medium text-foreground">{p.license_number || "—"}</p></div>
          <div><p className="text-muted-foreground">Stripe Connect</p><p className="font-medium text-foreground">{p.stripe_connect_account_id ? "Connected" : "Not connected"}</p></div>
          <div><p className="text-muted-foreground">Joined</p><p className="font-medium text-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</p></div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
          <Layers className="mx-auto h-5 w-5 text-indigo-400 mb-1" />
          <p className="text-xl font-bold text-foreground">{data.jobCount}</p>
          <p className="text-[10px] text-muted-foreground">Total Jobs</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
          <DollarSign className="mx-auto h-5 w-5 text-emerald-400 mb-1" />
          <p className="text-xl font-bold text-foreground">{data.invoiceCount}</p>
          <p className="text-[10px] text-muted-foreground">Invoices</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
          <FileText className="mx-auto h-5 w-5 text-purple-400 mb-1" />
          <p className="text-xl font-bold text-foreground">{data.reportCount}</p>
          <p className="text-[10px] text-muted-foreground">Reports</p>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><BarChart3 className="h-4 w-4" /> Recent Jobs</h3>
        {data.recentJobs.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No jobs yet</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 pr-4 font-medium">Customer</th><th className="pb-2 pr-4 font-medium">Address</th><th className="pb-2 pr-4 font-medium">Status</th><th className="pb-2 font-medium">Created</th></tr></thead>
              <tbody>{data.recentJobs.map(j => (
                <tr key={j.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">{j.customer_name || "—"}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{j.address || "—"}</td>
                  <td className="py-2 pr-4"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${j.status === "Completed" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"}`}>{j.status}</span></td>
                  <td className="py-2 text-muted-foreground">{new Date(j.created_at).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
