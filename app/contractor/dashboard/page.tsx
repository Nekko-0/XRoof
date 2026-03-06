"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import { Users, Briefcase, CheckCircle, MapPin, DollarSign, MessageSquare, ArrowRight } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"

type Job = {
  id: string
  address: string
  zip_code: string
  job_type: string
  description: string
  budget: number | null
  status: string
  created_at: string
  homeowner: { username: string } | null
}

export default function ContractorDashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [availableLeads, setAvailableLeads] = useState<Job[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch available leads (unassigned jobs)
      const { data: leadsRaw } = await supabase
        .from("jobs")
        .select("id, address, zip_code, job_type, description, budget, status, created_at, homeowner_id")
        .is("contractor_id", null)
        .order("created_at", { ascending: false })
        .limit(5)

      // Fetch homeowner profiles separately
      const ownerIds = [...new Set((leadsRaw || []).map((j: any) => j.homeowner_id).filter(Boolean))]
      let profileMap: Record<string, any> = {}
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", ownerIds)
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))
      }
      const leads = (leadsRaw || []).map((j: any) => ({
        ...j,
        homeowner: j.homeowner_id ? profileMap[j.homeowner_id] || null : null,
      }))

      setAvailableLeads(leads)

      // Count active jobs for this contractor
      const { count: active } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", user.id)
        .eq("status", "Accepted")

      setActiveCount(active || 0)

      // Count completed jobs for this contractor
      const { count: completed } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", user.id)
        .eq("status", "Completed")

      setCompletedCount(completed || 0)

      setLoading(false)
    }

    fetchData()
  }, [])

  const handleAccept = async (jobId: string) => {
    setAccepting(jobId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("jobs")
      .update({ contractor_id: user.id, status: "Accepted" })
      .eq("id", jobId)

    if (error) {
      alert("Error accepting lead: " + error.message)
    } else {
      setAvailableLeads(availableLeads.filter((l) => l.id !== jobId))
      setActiveCount(activeCount + 1)
    }
    setAccepting(null)
  }

  if (loading) return <p className="p-6">Loading dashboard...</p>

  const stats = [
    { label: "Available Leads", value: availableLeads.length.toString(), icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Active Jobs", value: activeCount.toString(), icon: Briefcase, color: "bg-yellow-50 text-yellow-700" },
    { label: "Completed Jobs", value: completedCount.toString(), icon: CheckCircle, color: "bg-green-50 text-green-700" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Contractor Dashboard
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your leads, jobs, and communications.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Leads */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Available Leads
          </h3>
          <Link
            href="/contractor/leads"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {availableLeads.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
            No available leads right now. Check back soon!
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {availableLeads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {lead.address}, {lead.zip_code}
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {lead.job_type}
                  </span>
                  <StatusBadge status={lead.status.toLowerCase()} />
                  {lead.budget && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${lead.budget.toLocaleString()}
                    </div>
                  )}
                </div>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{lead.description}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAccept(lead.id)}
                    disabled={accepting === lead.id}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {accepting === lead.id ? "Accepting..." : "Accept Lead"}
                  </button>
                  <Link
                    href="/contractor/messages"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Message Homeowner
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
