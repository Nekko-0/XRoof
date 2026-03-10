"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { MapPin, DollarSign, FileText, Phone, MessageSquare, Home as HomeIcon, CheckCircle, ScrollText, RotateCcw, Plus, EyeOff, Eye, Trash2 } from "lucide-react"
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

type FilterTab = "All" | "Accepted" | "Completed" | "Hidden"

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [reopening, setReopening] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [hiddenJobs, setHiddenJobs] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<FilterTab>("All")
  const [newLead, setNewLead] = useState({
    customer_name: "",
    customer_phone: "",
    address: "",
    zip_code: "",
    job_type: "",
    description: "",
    budget: "",
  })

  // Load hidden jobs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hiddenLeads")
      if (stored) setHiddenJobs(new Set(JSON.parse(stored)))
    } catch {}
  }, [])

  const updateHidden = (newSet: Set<string>) => {
    setHiddenJobs(newSet)
    localStorage.setItem("hiddenLeads", JSON.stringify([...newSet]))
  }

  const toggleHide = (jobId: string) => {
    const next = new Set(hiddenJobs)
    if (next.has(jobId)) next.delete(jobId)
    else next.add(jobId)
    updateHidden(next)
  }

  const handleDelete = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this lead? This cannot be undone.")) return
    const { error } = await supabase.from("jobs").delete().eq("id", jobId)
    if (error) {
      alert("Error deleting lead: " + error.message)
    } else {
      setJobs(jobs.filter((j) => j.id !== jobId))
      const next = new Set(hiddenJobs)
      next.delete(jobId)
      updateHidden(next)
    }
  }

  const fetchJobs = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = "/auth"; return }
    const user = session.user
    setUserId(user.id)

    const { data: jobsRaw } = await supabase
      .from("jobs")
      .select("id, address, zip_code, job_type, description, budget, status, created_at, customer_name, customer_phone, photo_urls, signature_url, signed_at")
      .eq("contractor_id", user.id)
      .order("created_at", { ascending: false })

    setJobs(jobsRaw || [])
    setLoading(false)
  }

  useEffect(() => { fetchJobs() }, [])

  const handleAddLead = async () => {
    if (!newLead.customer_name || !newLead.address || !newLead.zip_code || !newLead.job_type) {
      alert("Please fill in customer name, address, zip code, and job type")
      return
    }
    if (!userId) return

    setSaving(true)
    const { error } = await supabase.from("jobs").insert({
      customer_name: newLead.customer_name,
      customer_phone: newLead.customer_phone,
      address: newLead.address,
      zip_code: newLead.zip_code,
      job_type: newLead.job_type,
      description: newLead.description,
      budget: newLead.budget ? Number(newLead.budget) : null,
      status: "Accepted",
      contractor_id: userId,
    })

    if (error) {
      alert("Error adding lead: " + error.message)
    } else {
      // Notify admin
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", "contact@leons-roofing.com")
        .maybeSingle()

      if (adminProfile) {
        await supabase.from("notifications").insert({
          user_id: adminProfile.id,
          type: "contractor_lead_created",
          title: "Contractor Created a Lead",
          body: `${newLead.job_type} at ${newLead.address}`,
          read: false,
        })
      }

      setNewLead({ customer_name: "", customer_phone: "", address: "", zip_code: "", job_type: "", description: "", budget: "" })
      setShowForm(false)
      await fetchJobs()
    }
    setSaving(false)
  }

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

  // Filter jobs based on active tab
  const filteredJobs = jobs.filter((job) => {
    if (activeTab === "Hidden") return hiddenJobs.has(job.id)
    if (activeTab === "Accepted") return job.status === "Accepted" && !hiddenJobs.has(job.id)
    if (activeTab === "Completed") return job.status === "Completed" && !hiddenJobs.has(job.id)
    return !hiddenJobs.has(job.id) // "All" hides hidden
  })

  const hiddenCount = jobs.filter((j) => hiddenJobs.has(j.id)).length

  if (loading) return <p className="p-6">Loading your leads...</p>

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          My Leads
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Lead
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-xl bg-secondary/50 p-1">
        {(["All", "Accepted", "Completed", "Hidden"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
            {tab === "Hidden" && hiddenCount > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({hiddenCount})</span>
            )}
          </button>
        ))}
      </div>

      {/* Add Lead Form */}
      {showForm && (
        <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">New Lead</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Customer Name *</label>
              <input
                value={newLead.customer_name}
                onChange={(e) => setNewLead({ ...newLead, customer_name: e.target.value })}
                placeholder="John Smith"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Phone</label>
              <input
                value={newLead.customer_phone}
                onChange={(e) => setNewLead({ ...newLead, customer_phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Address *</label>
              <input
                value={newLead.address}
                onChange={(e) => setNewLead({ ...newLead, address: e.target.value })}
                placeholder="123 Main St"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Zip Code *</label>
              <input
                value={newLead.zip_code}
                onChange={(e) => setNewLead({ ...newLead, zip_code: e.target.value })}
                placeholder="90210"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Job Type *</label>
              <select
                value={newLead.job_type}
                onChange={(e) => setNewLead({ ...newLead, job_type: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select...</option>
                <option value="Roof Replacement">Roof Replacement</option>
                <option value="Roof Repair">Roof Repair</option>
                <option value="Roof Inspection">Roof Inspection</option>
                <option value="Gutter Installation">Gutter Installation</option>
                <option value="Gutter Repair">Gutter Repair</option>
                <option value="New Construction">New Construction</option>
                <option value="Storm Damage">Storm Damage</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Budget</label>
              <input
                type="number"
                value={newLead.budget}
                onChange={(e) => setNewLead({ ...newLead, budget: e.target.value })}
                placeholder="5000"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-foreground">Description</label>
              <textarea
                value={newLead.description}
                onChange={(e) => setNewLead({ ...newLead, description: e.target.value })}
                placeholder="Describe the job..."
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddLead}
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Lead"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
          {activeTab === "Hidden" ? "No hidden leads." : "No leads to show."}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredJobs.map((job) => {
            const isHidden = hiddenJobs.has(job.id)
            return (
              <div
                key={job.id}
                className={`rounded-2xl border border-border border-l-4 border-l-primary bg-card p-4 shadow-sm transition-opacity ${isHidden ? "opacity-50" : ""}`}
              >
                {/* Name + Status + Actions */}
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">{job.customer_name || "Customer"}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleHide(job.id)}
                      title={isHidden ? "Unhide lead" : "Hide lead"}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      title="Delete lead"
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <StatusBadge status={job.status} />
                  </div>
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
            )
          })}
        </div>
      )}

    </div>
  )
}
