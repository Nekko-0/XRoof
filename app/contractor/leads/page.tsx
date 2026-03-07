"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import { MapPin, DollarSign, FileText } from "lucide-react"
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
  customer_phone: string
  photo_urls?: string[]
}

export default function MyJobsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: jobsRaw } = await supabase
        .from("jobs")
        .select("id, address, zip_code, job_type, description, budget, status, created_at, customer_name, customer_phone, photo_urls")
        .eq("contractor_id", user.id)
        .order("created_at", { ascending: false })

      setJobs(jobsRaw || [])
      setLoading(false)
    }

    fetchJobs()
  }, [])

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "1 day ago"
    if (days < 7) return `${days} days ago`
    return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`
  }

  if (loading) return <p className="p-6">Loading your jobs...</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          My Jobs
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Jobs assigned to you by the admin.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
          No jobs assigned to you yet. Check back soon!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-foreground">{job.customer_name || "Customer"}</p>
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
                <span className="text-xs text-muted-foreground">{timeAgo(job.created_at)}</span>
              </div>
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
                href="/contractor/report"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <FileText className="h-3.5 w-3.5" />
                Submit Report
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
