"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import { Briefcase, CheckCircle, ClipboardList, MapPin, DollarSign, ArrowRight, FileText, Target, Users, PhoneCall, BarChart3 } from "lucide-react"
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
  customer_name: string
  photo_urls?: string[]
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
        .select("id, address, zip_code, job_type, description, budget, status, created_at, customer_name, photo_urls")
        .eq("contractor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      setMyJobs(jobsRaw || [])

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
    { label: "Assigned", value: assignedCount.toString(), icon: ClipboardList, color: "bg-blue-50 text-blue-700" },
    { label: "Active", value: activeCount.toString(), icon: Briefcase, color: "bg-yellow-50 text-yellow-700" },
    { label: "Completed", value: completedCount.toString(), icon: CheckCircle, color: "bg-green-50 text-green-700" },
  ]

  const steps = [
    {
      num: "1",
      title: "We Acquire Leads",
      desc: "XRoof generates roofing leads through ads, SEO, partnerships, and call centers",
      icon: Target,
    },
    {
      num: "2",
      title: "Leads Assigned to You",
      desc: "Quality leads are assigned to your account with full homeowner details",
      icon: Users,
    },
    {
      num: "3",
      title: "You Manage & Close",
      desc: "Contact homeowners, provide quotes, and update job status through your dashboard",
      icon: PhoneCall,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Hero section */}
      <div className="text-center lg:text-left">
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          XRoof
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your Contractor Lead Platform
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/contractor/leads"
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <FileText className="h-4 w-4" />
          View My Leads
        </Link>
        <a
          href="#dashboard-stats"
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          <BarChart3 className="h-4 w-4" />
          My Dashboard
        </a>
      </div>

      {/* How XRoof Works */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          How XRoof Works
        </h3>
        <div className="flex flex-col gap-4">
          {steps.map((step) => (
            <div key={step.num} className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {step.num}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div id="dashboard-stats" className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
            <p className="text-[11px] font-medium text-muted-foreground">{stat.label}</p>
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
          <div className="flex flex-col gap-3">
            {myJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-border border-l-4 border-l-primary bg-card p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{job.customer_name || "Customer"}</p>
                  <StatusBadge status={job.status} />
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.address}, {job.zip_code}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {job.job_type}
                  </span>
                  {job.budget && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${job.budget.toLocaleString()}
                    </span>
                  )}
                </div>
                {job.description && (
                  <p className="mb-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">{job.description}</p>
                )}
                {job.photo_urls && job.photo_urls.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {job.photo_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Job photo ${i + 1}`} className="h-12 w-12 rounded-lg object-cover border border-border" />
                      </a>
                    ))}
                  </div>
                )}
                <Link
                  href="/contractor/report"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Submit Report
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
