"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import { Briefcase, CheckCircle, ClipboardList, MapPin, DollarSign, MessageSquare, ArrowRight } from "lucide-react"
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
  photo_urls?: string[]
  homeowner: { username: string } | null
}

export default function ContractorDashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [myJobs, setMyJobs] = useState<Job[]>([])
  const [assignedCount, setAssignedCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch recent jobs assigned to this contractor
      const { data: jobsRaw } = await supabase
        .from("jobs")
        .select("id, address, zip_code, job_type, description, budget, status, created_at, homeowner_id, photo_urls")
        .eq("contractor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      // Fetch homeowner profiles separately
      const ownerIds = [...new Set((jobsRaw || []).map((j: any) => j.homeowner_id).filter(Boolean))]
      let profileMap: Record<string, any> = {}
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", ownerIds)
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))
      }
      const jobs = (jobsRaw || []).map((j: any) => ({
        ...j,
        homeowner: j.homeowner_id ? profileMap[j.homeowner_id] || null : null,
      }))

      setMyJobs(jobs)

      // Count assigned jobs
      const { count: assigned } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", user.id)
        .eq("status", "Assigned")

      setAssignedCount(assigned || 0)

      // Count active (accepted) jobs
      const { count: active } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", user.id)
        .eq("status", "Accepted")

      setActiveCount(active || 0)

      // Count completed jobs
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

  if (loading) return <p className="p-6">Loading dashboard...</p>

  const stats = [
    { label: "Assigned Jobs", value: assignedCount.toString(), icon: ClipboardList, color: "bg-blue-50 text-blue-700" },
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
          View your assigned jobs and communications.
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
            Your Jobs
          </h3>
          <Link
            href="/contractor/leads"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {myJobs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
            No jobs assigned to you yet. Check back soon!
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {myJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.address}, {job.zip_code}
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {job.job_type}
                  </span>
                  <StatusBadge status={job.status} />
                  {job.budget && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${job.budget.toLocaleString()}
                    </div>
                  )}
                </div>
                {job.homeowner && (
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Homeowner: {job.homeowner.username}
                  </p>
                )}
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{job.description}</p>
                {job.photo_urls && job.photo_urls.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {job.photo_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Job photo ${i + 1}`} className="h-14 w-14 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                  </div>
                )}
                <Link
                  href="/contractor/messages"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message Homeowner
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
