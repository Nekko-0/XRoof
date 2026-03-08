"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { MapPin, DollarSign, FileText, Phone, MessageSquare, Home as HomeIcon, CheckCircle, ScrollText, RotateCcw } from "lucide-react"
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
  signature_url?: string | null
  signed_at?: string | null
}

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [reopening, setReopening] = useState<string | null>(null)

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      const user = session.user

      const { data: jobsRaw } = await supabase
        .from("jobs")
        .select("id, address, zip_code, job_type, description, budget, status, created_at, customer_name, customer_phone, photo_urls, signature_url, signed_at")
        .eq("contractor_id", user.id)
        .order("created_at", { ascending: false })

      setJobs(jobsRaw || [])
      setLoading(false)
    }

    fetchJobs()
  }, [])

  const handleComplete = async (jobId: string) => {
    if (!confirm("Mark this job as completed?")) return

    setCompleting(jobId)
    const { error } = await supabase
      .from("jobs")
      .update({ status: "Completed" })
      .eq("id", jobId)

    if (error) {
      alert("Error: " + error.message)
    } else {
      setJobs(jobs.map((j) => j.id === jobId ? { ...j, status: "Completed" } : j))
    }
    setCompleting(null)
  }

  const handleReopen = async (jobId: string) => {
    if (!confirm("Reopen this job? Status will be set back to Accepted.")) return

    setReopening(jobId)
    const { error } = await supabase
      .from("jobs")
      .update({ status: "Accepted" })
      .eq("id", jobId)

    if (error) {
      alert("Error: " + error.message)
    } else {
      setJobs(jobs.map((j) => j.id === jobId ? { ...j, status: "Accepted" } : j))
    }
    setReopening(null)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / (1000 * 60))
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`
  }

  if (loading) return <p className="p-6">Loading your leads...</p>

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          My Leads
        </h2>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
          No leads assigned to you yet. Check back soon!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-border border-l-4 border-l-primary bg-card p-4 shadow-sm"
            >
              {/* Name + Status */}
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">{job.customer_name || "Customer"}</h3>
                <StatusBadge status={job.status} />
              </div>

              {/* Timestamp */}
              <p className="mb-3 text-xs text-muted-foreground">{timeAgo(job.created_at)}</p>

              {/* Info rows */}
              <div className="mb-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{job.address} &middot; {job.zip_code}</span>
                </div>
                {job.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{job.customer_phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <HomeIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{job.job_type}</span>
                </div>
              </div>

              {/* Description */}
              {job.description && (
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{job.description}</p>
              )}

              {/* Photos */}
              {job.photo_urls && job.photo_urls.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {job.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Job photo ${i + 1}`} className="h-14 w-14 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}

              {/* Signed Certificate */}
              {job.signature_url && (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Signed Certificate{job.signed_at && ` \u2014 ${new Date(job.signed_at).toLocaleDateString()}`}
                  </p>
                  <a href={job.signature_url} target="_blank" rel="noopener noreferrer">
                    <img src={job.signature_url} alt="Completion certificate" className="h-20 rounded-lg border border-border bg-white hover:opacity-80 transition-opacity" />
                  </a>
                </div>
              )}

              {/* Bottom row: Budget + Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {job.budget && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-emerald-400">
                      <DollarSign className="h-4 w-4" />
                      ${job.budget.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {job.customer_phone && (
                    <>
                      <a
                        href={`tel:${job.customer_phone}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                      <a
                        href={`sms:${job.customer_phone}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Text
                      </a>
                    </>
                  )}
                  <Link
                    href={`/contractor/contract/${job.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <ScrollText className="h-3.5 w-3.5" />
                    Contract
                  </Link>
                  <Link
                    href="/contractor/report"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Report
                  </Link>
                  {job.status !== "Completed" ? (
                    <button
                      onClick={() => handleComplete(job.id)}
                      disabled={completing === job.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {completing === job.id ? "..." : "Complete"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReopen(job.id)}
                      disabled={reopening === job.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {reopening === job.id ? "..." : "Reopen"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
