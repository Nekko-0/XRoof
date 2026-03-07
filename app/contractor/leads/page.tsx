"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import { MapPin, DollarSign, FileText, Phone, MessageSquare, Home as HomeIcon, CheckCircle, PenTool } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { SignaturePadModal } from "@/components/signature-pad"

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
}

export default function MyJobsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [signingJob, setSigningJob] = useState<string | null>(null)
  const [savingSignature, setSavingSignature] = useState(false)

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: jobsRaw } = await supabase
        .from("jobs")
        .select("id, address, zip_code, job_type, description, budget, status, created_at, customer_name, customer_phone, photo_urls, signature_url")
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

  const handleSaveSignature = async (dataUrl: string) => {
    if (!signingJob) return
    setSavingSignature(true)

    // Convert data URL to blob
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const fileName = `${signingJob}-${Date.now()}.png`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(fileName, blob, { contentType: "image/png" })

    if (uploadError) {
      alert("Error uploading signature: " + uploadError.message)
      setSavingSignature(false)
      return
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("signatures")
      .getPublicUrl(fileName)

    const signatureUrl = urlData.publicUrl

    // Update job record
    const { error: updateError } = await supabase
      .from("jobs")
      .update({ signature_url: signatureUrl })
      .eq("id", signingJob)

    if (updateError) {
      alert("Error saving signature: " + updateError.message)
    } else {
      setJobs(jobs.map((j) => j.id === signingJob ? { ...j, signature_url: signatureUrl } : j))
      setSigningJob(null)
    }
    setSavingSignature(false)
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

              {/* Signature */}
              {job.signature_url && (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Customer Signature</p>
                  <img src={job.signature_url} alt="Customer signature" className="h-16 rounded-lg border border-border bg-white" />
                </div>
              )}

              {/* Bottom row: Budget + Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {job.budget && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-green-700">
                      <DollarSign className="h-4 w-4" />
                      ${job.budget.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {job.customer_phone && (
                    <a
                      href={`tel:${job.customer_phone}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                    >
                      <Phone className="h-3 w-3" />
                      Call
                    </a>
                    <a
                      href={`sms:${job.customer_phone}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Text
                    </a>
                  )}
                  <Link
                    href="/contractor/report"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <FileText className="h-3 w-3" />
                    Report
                  </Link>
                  {job.status !== "Completed" && !job.signature_url && (
                    <button
                      onClick={() => setSigningJob(job.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                    >
                      <PenTool className="h-3 w-3" />
                      Signature
                    </button>
                  )}
                  {job.status !== "Completed" && (
                    <button
                      onClick={() => handleComplete(job.id)}
                      disabled={completing === job.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-3 w-3" />
                      {completing === job.id ? "..." : "Complete"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SignaturePadModal
        open={signingJob !== null}
        onClose={() => setSigningJob(null)}
        onSave={handleSaveSignature}
        saving={savingSignature}
      />
    </div>
  )
}
