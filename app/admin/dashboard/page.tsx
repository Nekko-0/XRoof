"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { ClipboardList, Users, CheckCircle, ArrowRight, MapPin } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"

type RecentJob = {
  id: string
  address: string
  zip_code: string
  job_type: string
  status: string
  created_at: string
  customer_name: string
}

export default function AdminDashboard() {
  const [pendingCount, setPendingCount] = useState(0)
  const [contractorCount, setContractorCount] = useState(0)
  const [assignedTodayCount, setAssignedTodayCount] = useState(0)
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // Count pending jobs
      const { count: pending } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pending")

      setPendingCount(pending || 0)

      // Count contractors
      const { count: contractors } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "Contractor")

      setContractorCount(contractors || 0)

      // Count assigned today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: assignedToday } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "Assigned")
        .gte("updated_at", today.toISOString())

      setAssignedTodayCount(assignedToday || 0)

      // Get recent pending jobs
      const { data: jobsRaw } = await supabase
        .from("jobs")
        .select("id, address, zip_code, job_type, status, created_at, customer_name")
        .in("status", ["Pending", "Assigned"])
        .order("created_at", { ascending: false })
        .limit(10)

      if (jobsRaw && jobsRaw.length > 0) {
        setRecentJobs(jobsRaw.map((j: any) => ({
          id: j.id,
          address: j.address,
          zip_code: j.zip_code,
          job_type: j.job_type,
          status: j.status,
          created_at: j.created_at,
          customer_name: j.customer_name || "Unknown",
        })))
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) return <p className="p-6">Loading admin dashboard...</p>

  const stats = [
    { label: "Pending Leads", value: pendingCount.toString(), icon: ClipboardList, color: "bg-amber-50 text-amber-700" },
    { label: "Total Contractors", value: contractorCount.toString(), icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Assigned Today", value: assignedTodayCount.toString(), icon: CheckCircle, color: "bg-green-50 text-green-700" },
  ]

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "1 day ago"
    if (days < 7) return `${days} days ago`
    return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Admin Dashboard
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage leads and assign contractors.
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

      {/* Recent Jobs */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Leads
          </h3>
          <Link
            href="/admin/jobs"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
            No leads yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{job.customer_name}</p>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {job.job_type}
                    </span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {job.address}, {job.zip_code} &middot; {timeAgo(job.created_at)}
                  </div>
                </div>
                <Link
                  href="/admin/jobs"
                  className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
