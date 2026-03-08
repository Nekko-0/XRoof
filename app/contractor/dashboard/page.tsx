"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Briefcase, CheckCircle, ClipboardList, MapPin, DollarSign, FileText, Target, Users, PhoneCall, ScrollText, MessageSquare, Gift, BadgePercent } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"

type Job = {
  id: string
  address: string
  zip_code: string
  job_type: string
  budget: number | null
  status: string
  created_at: string
  customer_name: string
}

export default function ContractorDashboard() {
  const [completedJobs, setCompletedJobs] = useState<Job[]>([])
  const [assignedCount, setAssignedCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      const user = session.user

      // Fetch all completed jobs
      const { data: completedRaw } = await supabase
        .from("jobs")
        .select("id, address, zip_code, job_type, budget, status, created_at, customer_name")
        .eq("contractor_id", user.id)
        .eq("status", "Completed")
        .order("created_at", { ascending: false })

      setCompletedJobs(completedRaw || [])

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
    { label: "Assigned", value: assignedCount.toString(), icon: ClipboardList, color: "bg-blue-900/30 text-blue-400" },
    { label: "Active", value: activeCount.toString(), icon: Briefcase, color: "bg-yellow-900/30 text-yellow-400" },
    { label: "Completed", value: completedCount.toString(), icon: CheckCircle, color: "bg-emerald-900/30 text-emerald-400" },
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
    {
      num: "4",
      title: "Free Roof Reports",
      desc: "I will make you a free roof report you can use to close deals, free of charge",
      icon: Gift,
    },
    {
      num: "5",
      title: "10% on Signed Jobs",
      desc: "After you close and sign a job, I will receive 10% of the signed contract",
      icon: BadgePercent,
    },
    {
      num: "6",
      title: "No Monthly Fees",
      desc: "You don't pay anything — no monthly subscriptions that might or might not work. Start for free, only pay when you close jobs",
      icon: DollarSign,
    },
    {
      num: "7",
      title: "Direct Support",
      desc: "If questions arise, you can contact me via the Messages tab. I will help with any problem you may have",
      icon: MessageSquare,
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
          href="#completed-jobs"
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          <CheckCircle className="h-4 w-4" />
          Completed Jobs
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
      <div id="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Completed Jobs */}
      <div id="completed-jobs">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Completed Jobs
        </h3>
        {completedJobs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
            No completed jobs yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {completedJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-border border-l-4 border-l-emerald-600 bg-card p-4 shadow-sm"
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
                <Link
                  href={`/contractor/contract/${job.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <ScrollText className="h-3.5 w-3.5" />
                  View Contract
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
