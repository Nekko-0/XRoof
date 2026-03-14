"use client"

import { useEffect, useState } from "react"
import { authFetch } from "@/lib/auth-fetch"
import { supabase } from "@/lib/supabaseClient"
import { useRole } from "@/lib/role-context"
import { useToast } from "@/lib/toast-context"
import {
  MapPin, Phone, DollarSign, MessageSquare, Clock, ChevronDown,
  Send, CheckCircle, ArrowRight, Zap, Plus, X,
  Filter, ArrowUpDown, Mail, FileText, PenTool, Receipt, Calendar,
  AlertCircle, Trash2, TrendingUp,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

type Job = {
  id: string
  address: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  job_type: string
  status: string
  budget: number | null
  created_at: string
  source?: string
  scheduled_date?: string | null
  description?: string
}

type Activity = {
  id: string
  type: string
  content: string
  created_at: string
}

type Followup = {
  id: string
  due_date: string
  note: string
  completed: boolean
}

type JobCost = {
  id: string
  category: string
  description: string
  amount: number
}

type RelatedData = {
  contracts: Record<string, { status: string; signed: boolean }>
  invoices: Record<string, { total: number; paid: number; count: number; paidCount: number }>
  reports: Record<string, { completed: boolean; sent: boolean }>
  followups: Record<string, { overdue: number; dueToday: number; upcoming: number }>
}

const PIPELINE_STAGES = ["New", "Accepted", "Estimate Sent", "Scheduled", "In Progress", "Completed", "Lost"] as const

const STAGE_CONFIG: Record<string, { bg: string; hex: string; text: string; light: string; lightText: string; border: string }> = {
  "New":           { bg: "bg-slate-500",   hex: "#64748b", text: "text-slate-700 dark:text-slate-300",   light: "bg-slate-500/10",   lightText: "text-slate-600 dark:text-slate-400",   border: "border-t-slate-500" },
  "Accepted":      { bg: "bg-amber-500",   hex: "#f59e0b", text: "text-amber-700 dark:text-amber-300",   light: "bg-amber-500/10",   lightText: "text-amber-600 dark:text-amber-400",   border: "border-t-amber-500" },
  "Estimate Sent": { bg: "bg-blue-500",    hex: "#3b82f6", text: "text-blue-700 dark:text-blue-300",    light: "bg-blue-500/10",    lightText: "text-blue-600 dark:text-blue-400",    border: "border-t-blue-500" },
  "Scheduled":     { bg: "bg-blue-500",  hex: "#3b82f6", text: "text-blue-700 dark:text-blue-300",  light: "bg-blue-500/10",  lightText: "text-blue-600 dark:text-blue-400",  border: "border-t-blue-500" },
  "In Progress":   { bg: "bg-cyan-500",    hex: "#06b6d4", text: "text-cyan-700 dark:text-cyan-300",    light: "bg-cyan-500/10",    lightText: "text-cyan-600 dark:text-cyan-400",    border: "border-t-cyan-500" },
  "Completed":     { bg: "bg-emerald-500", hex: "#10b981", text: "text-emerald-700 dark:text-emerald-300", light: "bg-emerald-500/10", lightText: "text-emerald-600 dark:text-emerald-400", border: "border-t-emerald-500" },
  "Lost":          { bg: "bg-red-500",     hex: "#ef4444", text: "text-red-700 dark:text-red-300",     light: "bg-red-500/10",     lightText: "text-red-600 dark:text-red-400",     border: "border-t-red-500" },
}

const NEXT_STAGES: Record<string, string[]> = {
  "New":           ["Accepted", "Lost"],
  "Accepted":      ["Estimate Sent", "Scheduled", "Lost"],
  "Estimate Sent": ["Scheduled", "Accepted", "Lost"],
  "Scheduled":     ["In Progress", "Accepted", "Lost"],
  "In Progress":   ["Completed", "Scheduled"],
  "Completed":     [],
  "Lost":          ["New", "Accepted"],
}

const ACTIVITY_TYPES = ["call", "email", "visit", "note"] as const
const JOB_TYPES = ["Roof Replacement", "Roof Repair", "Inspection", "Gutter", "Siding", "Other"] as const

type SortOption = "newest" | "oldest" | "value-high" | "value-low" | "time-in-stage"

export default function PipelinePage() {
  const { accountId, userId: roleUserId, role: teamRole } = useRole()
  const toast = useToast()
  const canEdit = teamRole !== "viewer"
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [followups, setFollowups] = useState<Followup[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [newActivity, setNewActivity] = useState({ type: "note", content: "" })
  const [followupDays, setFollowupDays] = useState("")
  const [followupNote, setFollowupNote] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all")
  const [sort, setSort] = useState<SortOption>("newest")
  const [movingJob, setMovingJob] = useState<string | null>(null)
  const [mobileStage, setMobileStage] = useState<string>("New")
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [related, setRelated] = useState<RelatedData | null>(null)
  const [showAddJob, setShowAddJob] = useState(false)
  const [newJob, setNewJob] = useState({ customer_name: "", address: "", customer_phone: "", customer_email: "", job_type: "", budget: "" })
  const [addingJob, setAddingJob] = useState(false)
  const [googleReviewUrl, setGoogleReviewUrl] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [leadScores, setLeadScores] = useState<Record<string, { score: number; factors: string[] }>>({})

  useEffect(() => {
    const fetchJobs = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      setUserId(session.user.id)

      // Use accountId from role context (for team members, this is the owner's ID)
      const contractorId = accountId || session.user.id

      const { data } = await supabase
        .from("jobs")
        .select("id, address, customer_name, customer_phone, customer_email, job_type, status, budget, created_at, source, scheduled_date, description")
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false })

      setJobs(data || [])

      // Fetch profile for review auto-send
      const { data: prof } = await supabase
        .from("profiles")
        .select("google_review_url, company_name")
        .eq("id", contractorId)
        .single()
      if (prof?.google_review_url) setGoogleReviewUrl(prof.google_review_url)
      if (prof?.company_name) setCompanyName(prof.company_name)

      setLoading(false)

      // Fetch lead scores
      authFetch("/api/leads/score")
        .then((r) => r.json())
        .then((data) => { if (data.scores) setLeadScores(data.scores) })
        .catch(() => {})
    }
    fetchJobs()
  }, [accountId])

  // Batch-load related data once jobs are available
  useEffect(() => {
    if (jobs.length === 0) return
    const jobIds = jobs.map((j) => j.id)

    const loadRelated = async () => {
      const [contractsRes, invoicesRes, reportsRes, followupsRes] = await Promise.all([
        supabase.from("contracts").select("job_id, status, customer_signed_at").in("job_id", jobIds),
        supabase.from("invoices").select("job_id, status, amount").in("job_id", jobIds),
        supabase.from("reports").select("job_id, report_completed, viewing_token").in("job_id", jobIds),
        supabase.from("followups").select("job_id, due_date, completed").in("job_id", jobIds).eq("completed", false),
      ])

      // Build contract map
      const contracts: RelatedData["contracts"] = {}
      for (const c of contractsRes.data || []) {
        contracts[c.job_id] = { status: c.status, signed: !!c.customer_signed_at }
      }

      // Build invoice map (aggregate per job)
      const invoices: RelatedData["invoices"] = {}
      for (const inv of invoicesRes.data || []) {
        if (!invoices[inv.job_id]) invoices[inv.job_id] = { total: 0, paid: 0, count: 0, paidCount: 0 }
        const amt = (inv.amount || 0) / 100 // cents to dollars
        invoices[inv.job_id].total += amt
        invoices[inv.job_id].count += 1
        if (inv.status === "paid") {
          invoices[inv.job_id].paid += amt
          invoices[inv.job_id].paidCount += 1
        }
      }

      // Build report map
      const reports: RelatedData["reports"] = {}
      for (const r of reportsRes.data || []) {
        reports[r.job_id] = { completed: !!r.report_completed, sent: !!r.viewing_token }
      }

      // Build followup map
      const followupsMap: RelatedData["followups"] = {}
      const now = Date.now()
      for (const f of followupsRes.data || []) {
        if (!followupsMap[f.job_id]) followupsMap[f.job_id] = { overdue: 0, dueToday: 0, upcoming: 0 }
        const diff = new Date(f.due_date).getTime() - now
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        if (days < 0) followupsMap[f.job_id].overdue += 1
        else if (days === 0) followupsMap[f.job_id].dueToday += 1
        else followupsMap[f.job_id].upcoming += 1
      }

      setRelated({ contracts, invoices, reports, followups: followupsMap })
    }

    loadRelated()
  }, [jobs])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = () => { setShowFilter(false); setShowSort(false) }
    if (showFilter || showSort) {
      document.addEventListener("click", handleClick)
      return () => document.removeEventListener("click", handleClick)
    }
  }, [showFilter, showSort])

  const loadJobDetails = async (jobId: string) => {
    if (expandedJob === jobId) { setExpandedJob(null); return }
    setExpandedJob(jobId)
    setLoadingDetails(true)

    const [actRes, fuRes] = await Promise.all([
      authFetch(`/api/activities?job_id=${jobId}`),
      authFetch(`/api/followups?job_id=${jobId}`),
    ])

    const actData = await actRes.json()
    const fuData = await fuRes.json()
    setActivities(Array.isArray(actData) ? actData : [])
    setFollowups(Array.isArray(fuData) ? fuData : [])
    setLoadingDetails(false)
  }

  const handleMoveStage = async (jobId: string, newStatus: string) => {
    setMovingJob(jobId)
    const now = new Date().toISOString()
    const timestamps: Record<string, string | null> = {}
    if (newStatus === "Accepted") { timestamps.accepted_at = now }
    if (newStatus === "Estimate Sent") { timestamps.estimate_sent_at = now }
    if (newStatus === "Completed") { timestamps.completed_at = now }
    // Clear downstream timestamps when moving backward
    const stageOrder = ["New", "Accepted", "Estimate Sent", "Scheduled", "In Progress", "Completed"]
    const idx = stageOrder.indexOf(newStatus)
    if (idx >= 0) {
      if (idx < stageOrder.indexOf("Accepted")) timestamps.accepted_at = null as any
      if (idx < stageOrder.indexOf("Estimate Sent")) timestamps.estimate_sent_at = null as any
      if (idx < stageOrder.indexOf("Completed")) timestamps.completed_at = null as any
    }
    const { error } = await supabase.from("jobs").update({ status: newStatus, ...timestamps }).eq("id", jobId)
    if (error) { toast.error("Error: " + error.message); setMovingJob(null); return }
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: newStatus } : j))
    setExpandedJob(null)
    await authFetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, user_id: userId, type: "system", content: `Status changed to ${newStatus}` }),
    })
    // Fire automation trigger for completed jobs + auto-request review
    if (newStatus === "Completed") {
      authFetch("/api/automations/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "job_completed", job_id: jobId, contractor_id: accountId }),
      }).catch(() => {})

      // Auto-request Google review if profile has review URL and job has customer email
      const job = jobs.find((j) => j.id === jobId)
      if (job && googleReviewUrl) {
        const email = (job as any).customer_email || (job as any).email
        if (email) {
          authFetch("/api/reviews/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              job_id: jobId,
              customer_email: email,
              customer_name: job.customer_name,
              company_name: companyName,
              google_review_url: googleReviewUrl,
            }),
          }).catch(() => {})
        }
      }
    }
    setMovingJob(null)
  }

  const handleAddActivity = async (jobId: string) => {
    if (!newActivity.content.trim()) return
    const res = await authFetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, user_id: userId, type: newActivity.type, content: newActivity.content }),
    })
    const data = await res.json()
    if (data.id) {
      setActivities((prev) => [data, ...prev])
      setNewActivity({ type: "note", content: "" })
    }
  }

  const handleAddFollowup = async (jobId: string) => {
    if (!followupDays) return
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + Number(followupDays))

    const res = await authFetch("/api/followups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, user_id: userId, due_date: dueDate.toISOString(), note: followupNote }),
    })
    const data = await res.json()
    if (data.id) {
      setFollowups((prev) => [...prev, data])
      setFollowupDays("")
      setFollowupNote("")
    }
  }

  const handleCompleteFollowup = async (id: string) => {
    await authFetch("/api/followups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed: true }),
    })
    setFollowups((prev) => prev.map((f) => f.id === id ? { ...f, completed: true } : f))
  }

  const handleAddJob = async () => {
    if (!canEdit || !newJob.customer_name.trim() || !newJob.address.trim()) return
    setAddingJob(true)
    const { data, error } = await supabase.from("jobs").insert({
      contractor_id: accountId || userId,
      customer_name: newJob.customer_name,
      address: newJob.address,
      customer_phone: newJob.customer_phone,
      customer_email: newJob.customer_email,
      job_type: newJob.job_type || "Other",
      budget: newJob.budget ? Number(newJob.budget) : null,
      status: "New",
      source: "manual",
    }).select().single()

    if (error) { toast.error("Error: " + error.message) }
    else if (data) {
      setJobs((prev) => [data, ...prev])
      setNewJob({ customer_name: "", address: "", customer_phone: "", customer_email: "", job_type: "", budget: "" })
      setShowAddJob(false)
      // Auto-create customer record
      supabase.from("customers").insert({
        contractor_id: accountId || userId,
        name: newJob.customer_name.trim(),
        email: newJob.customer_email || null,
        phone: newJob.customer_phone || null,
        address: newJob.address.trim(),
      }).then(() => {})
      // Fire new_lead automation trigger
      authFetch("/api/automations/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "new_lead", job_id: data.id, contractor_id: accountId || userId }),
      }).catch(() => {})
    }
    setAddingJob(false)
  }

  const activityIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="h-3 w-3" />
      case "email": return <Send className="h-3 w-3" />
      case "visit": return <MapPin className="h-3 w-3" />
      case "system": return <Zap className="h-3 w-3" />
      default: return <MessageSquare className="h-3 w-3" />
    }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / (1000 * 60))
    if (mins < 60) return "Just now"
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return "1d ago"
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  const daysInStage = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 3) return { days, width: "25%", color: "bg-emerald-500", label: `${days}d` }
    if (days <= 7) return { days, width: "50%", color: "bg-amber-500", label: `${days}d` }
    if (days <= 14) return { days, width: "75%", color: "bg-amber-500", label: `${days}d` }
    return { days, width: "100%", color: "bg-red-500", label: `${days}d` }
  }

  const followupUrgency = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - Date.now()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days < 0) return { label: "Overdue", color: "text-red-500", dot: "bg-red-500" }
    if (days === 0) return { label: "Today", color: "text-amber-500", dot: "bg-amber-500" }
    if (days <= 2) return { label: `${days}d left`, color: "text-amber-500", dot: "bg-amber-500" }
    return { label: `${days}d left`, color: "text-muted-foreground", dot: "bg-muted-foreground" }
  }

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const sortJobs = (jobList: Job[]) => {
    const sorted = [...jobList]
    switch (sort) {
      case "newest": return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case "oldest": return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case "value-high": return sorted.sort((a, b) => (b.budget || 0) - (a.budget || 0))
      case "value-low": return sorted.sort((a, b) => (a.budget || 0) - (b.budget || 0))
      case "time-in-stage": return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      default: return sorted
    }
  }

  // Computed
  const pipelineValue = jobs.filter((j) => !["Completed", "Lost"].includes(j.status)).reduce((sum, j) => sum + (j.budget || 0), 0)
  const activeJobs = jobs.filter((j) => !["Completed", "Lost"].includes(j.status)).length

  const visibleStages = PIPELINE_STAGES.filter((s) => {
    if (filter === "active") return !["Completed", "Lost"].includes(s)
    if (filter === "closed") return ["Completed", "Lost"].includes(s)
    return true
  })

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <Skeleton className="h-8 w-48" />
        {/* Pipeline columns */}
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {activeJobs} active · <span className="font-semibold text-emerald-600 dark:text-emerald-400">${pipelineValue.toLocaleString()}</span> in pipeline
          </p>
          {canEdit && (
            <button
              onClick={() => setShowAddJob(true)}
              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Job
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowFilter(!showFilter); setShowSort(false) }}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              {filter === "all" ? "All Stages" : filter === "active" ? "Active" : "Closed"}
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-border bg-card shadow-lg py-1">
                {[
                  { key: "all" as const, label: "All Stages" },
                  { key: "active" as const, label: "Active Only" },
                  { key: "closed" as const, label: "Closed Only" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => { setFilter(f.key); setShowFilter(false) }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-secondary/50 transition-colors ${filter === f.key ? "font-semibold text-primary" : "text-foreground"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowSort(!showSort); setShowFilter(false) }}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-border bg-card shadow-lg py-1">
                {[
                  { key: "newest" as SortOption, label: "Newest First" },
                  { key: "oldest" as SortOption, label: "Oldest First" },
                  { key: "value-high" as SortOption, label: "Highest Value" },
                  { key: "value-low" as SortOption, label: "Lowest Value" },
                  { key: "time-in-stage" as SortOption, label: "Longest in Stage" },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => { setSort(s.key); setShowSort(false) }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-secondary/50 transition-colors ${sort === s.key ? "font-semibold text-primary" : "text-foreground"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Stage Tabs */}
      <div className="flex lg:hidden overflow-x-auto gap-1 pb-3 flex-shrink-0 -mx-1 px-1 scrollbar-hide">
        {visibleStages.map((stage) => {
          const config = STAGE_CONFIG[stage]
          const count = jobs.filter((j) => j.status === stage).length
          return (
            <button
              key={stage}
              onClick={() => setMobileStage(stage)}
              className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                mobileStage === stage
                  ? `${config.light} ${config.lightText} ring-1 ring-current`
                  : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              {stage} <span className="ml-1 opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Desktop: Kanban Board */}
      <div className="hidden lg:flex flex-1 gap-3 overflow-x-auto pb-2 min-h-0 justify-center">
        {visibleStages.map((stage) => {
          const stageJobs = sortJobs(jobs.filter((j) => j.status === stage))
          const config = STAGE_CONFIG[stage]
          const stageValue = stageJobs.reduce((sum, j) => sum + (j.budget || 0), 0)

          // Column summary stats
          const stageContracts = stageJobs.filter((j) => related?.contracts[j.id]).length
          const stageSigned = stageJobs.filter((j) => related?.contracts[j.id]?.signed).length
          const stageInvoiced = stageJobs.filter((j) => related?.invoices[j.id]).length
          const stagePaid = stageJobs.filter((j) => {
            const inv = related?.invoices[j.id]
            return inv && inv.paidCount === inv.count && inv.count > 0
          }).length

          return (
            <div key={stage} className="flex flex-col flex-shrink-0 w-[320px] min-h-0">
              {/* Column Header */}
              <div className={`rounded-t-xl border border-border bg-card border-t-[3px] ${config.border} px-3 py-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{stage}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${config.light} ${config.lightText}`}>
                      {stageJobs.length}
                    </span>
                  </div>
                  {stageValue > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      ${stageValue >= 1000 ? `${(stageValue / 1000).toFixed(stageValue >= 10000 ? 0 : 1)}k` : stageValue}
                    </span>
                  )}
                </div>
                {/* Column micro-stats */}
                {stageJobs.length > 0 && (stageContracts > 0 || stageInvoiced > 0) && (
                  <div className="flex items-center gap-3 mt-1.5">
                    {stageContracts > 0 && (
                      <span className="text-[10px] text-muted-foreground/60">
                        <PenTool className="inline h-2.5 w-2.5 mr-0.5" />{stageSigned}/{stageContracts} signed
                      </span>
                    )}
                    {stageInvoiced > 0 && (
                      <span className="text-[10px] text-muted-foreground/60">
                        <Receipt className="inline h-2.5 w-2.5 mr-0.5" />{stagePaid}/{stageInvoiced} paid
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Column Body */}
              <div className="flex-1 overflow-y-auto rounded-b-xl border border-t-0 border-border bg-secondary/20 p-2 space-y-2">
                {stageJobs.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-xs text-muted-foreground/40">No jobs</p>
                  </div>
                ) : (
                  stageJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      stage={stage}
                      config={config}
                      expanded={expandedJob === job.id}
                      movingJob={movingJob}
                      loadingDetails={loadingDetails}
                      activities={activities}
                      followups={followups}
                      newActivity={newActivity}
                      followupDays={followupDays}
                      followupNote={followupNote}
                      related={related}
                      onToggle={() => loadJobDetails(job.id)}
                      onMoveStage={handleMoveStage}
                      onAddActivity={() => handleAddActivity(job.id)}
                      onSetNewActivity={setNewActivity}
                      onAddFollowup={() => handleAddFollowup(job.id)}
                      onSetFollowupDays={setFollowupDays}
                      onSetFollowupNote={setFollowupNote}
                      onCompleteFollowup={handleCompleteFollowup}
                      timeAgo={timeAgo}
                      daysInStage={daysInStage}
                      followupUrgency={followupUrgency}
                      activityIcon={activityIcon}
                      getInitials={getInitials}
                      formatShortDate={formatShortDate}
                      canEdit={canEdit}
                      leadScore={leadScores[job.id]}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: Card List for selected stage */}
      <div className="flex-1 overflow-y-auto lg:hidden space-y-2 min-h-0">
        {(() => {
          const stageJobs = sortJobs(jobs.filter((j) => j.status === mobileStage))
          const config = STAGE_CONFIG[mobileStage]
          const stageValue = stageJobs.reduce((sum, j) => sum + (j.budget || 0), 0)

          return (
            <>
              {stageValue > 0 && (
                <p className="text-xs text-muted-foreground px-1">
                  Stage total: <span className="font-semibold text-emerald-600 dark:text-emerald-400">${stageValue.toLocaleString()}</span>
                </p>
              )}
              {stageJobs.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm text-muted-foreground/40">No jobs in {mobileStage}</p>
                </div>
              ) : (
                stageJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    stage={mobileStage}
                    config={config}
                    expanded={expandedJob === job.id}
                    movingJob={movingJob}
                    loadingDetails={loadingDetails}
                    activities={activities}
                    followups={followups}
                    newActivity={newActivity}
                    followupDays={followupDays}
                    followupNote={followupNote}
                    related={related}
                    onToggle={() => loadJobDetails(job.id)}
                    onMoveStage={handleMoveStage}
                    onAddActivity={() => handleAddActivity(job.id)}
                    onSetNewActivity={setNewActivity}
                    onAddFollowup={() => handleAddFollowup(job.id)}
                    onSetFollowupDays={setFollowupDays}
                    onSetFollowupNote={setFollowupNote}
                    onCompleteFollowup={handleCompleteFollowup}
                    timeAgo={timeAgo}
                    daysInStage={daysInStage}
                    followupUrgency={followupUrgency}
                    activityIcon={activityIcon}
                    getInitials={getInitials}
                    formatShortDate={formatShortDate}
                    canEdit={canEdit}
                    leadScore={leadScores[job.id]}
                  />
                ))
              )}
            </>
          )
        })()}
      </div>

      {/* Empty State */}
      {jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-3">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-base font-bold text-foreground">No jobs yet</h3>
          <p className="mt-1 text-sm text-muted-foreground text-center max-w-xs">
            Add your first job or get one through your website widget.
          </p>
          <button
            onClick={() => setShowAddJob(true)}
            className="mt-3 flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Job
          </button>
        </div>
      )}

      {/* Add Job Modal */}
      {showAddJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddJob(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">Add New Job</h3>
              <button onClick={() => setShowAddJob(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={newJob.customer_name}
                onChange={(e) => setNewJob({ ...newJob, customer_name: e.target.value })}
                placeholder="Customer name *"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                value={newJob.address}
                onChange={(e) => setNewJob({ ...newJob, address: e.target.value })}
                placeholder="Address *"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={newJob.customer_phone}
                  onChange={(e) => setNewJob({ ...newJob, customer_phone: e.target.value })}
                  placeholder="Phone"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  value={newJob.customer_email}
                  onChange={(e) => setNewJob({ ...newJob, customer_email: e.target.value })}
                  placeholder="Email"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newJob.job_type}
                  onChange={(e) => setNewJob({ ...newJob, job_type: e.target.value })}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Job type</option>
                  {JOB_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={newJob.budget}
                  onChange={(e) => setNewJob({ ...newJob, budget: e.target.value })}
                  placeholder="Budget ($)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <button
              onClick={handleAddJob}
              disabled={addingJob || !newJob.customer_name.trim() || !newJob.address.trim()}
              className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {addingJob ? "Adding..." : "Add to Pipeline"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Job Card Component ──────────────────────────────────────────────

type JobCardProps = {
  job: Job
  stage: string
  config: typeof STAGE_CONFIG[string]
  expanded: boolean
  movingJob: string | null
  loadingDetails: boolean
  activities: Activity[]
  followups: Followup[]
  newActivity: { type: string; content: string }
  followupDays: string
  followupNote: string
  related: RelatedData | null
  onToggle: () => void
  onMoveStage: (jobId: string, newStatus: string) => void
  onAddActivity: () => void
  onSetNewActivity: (v: { type: string; content: string }) => void
  onAddFollowup: () => void
  onSetFollowupDays: (v: string) => void
  onSetFollowupNote: (v: string) => void
  onCompleteFollowup: (id: string) => void
  timeAgo: (d: string) => string
  daysInStage: (d: string) => { days: number; width: string; color: string; label: string }
  followupUrgency: (d: string) => { label: string; color: string; dot: string }
  activityIcon: (t: string) => React.ReactNode
  getInitials: (n: string) => string
  formatShortDate: (d: string) => string
  canEdit: boolean
  leadScore?: { score: number; factors: string[] }
}

const COST_CATEGORIES = ["Materials", "Labor", "Subcontractor", "Permits", "Dumpster", "Other"] as const

const SCORE_COLORS: Record<number, string> = {
  1: "bg-red-500/20 text-red-400",
  2: "bg-orange-500/20 text-orange-400",
  3: "bg-yellow-500/20 text-yellow-400",
  4: "bg-emerald-500/20 text-emerald-400",
  5: "bg-emerald-600/20 text-emerald-300",
}

function JobCard({
  job, stage, config, expanded, movingJob, loadingDetails,
  activities, followups, newActivity, followupDays, followupNote, related,
  onToggle, onMoveStage, onAddActivity, onSetNewActivity,
  onAddFollowup, onSetFollowupDays, onSetFollowupNote,
  onCompleteFollowup, timeAgo, daysInStage, followupUrgency,
  activityIcon, getInitials, formatShortDate, canEdit, leadScore,
}: JobCardProps) {
  const stage_info = daysInStage(job.created_at)
  const [costs, setCosts] = useState<JobCost[]>([])
  const [costsLoaded, setCostsLoaded] = useState(false)
  const [newCost, setNewCost] = useState({ category: "Materials", description: "", amount: "" })
  const [showCosts, setShowCosts] = useState(false)

  // Load costs when expanded
  useEffect(() => {
    if (expanded && !costsLoaded) {
      authFetch(`/api/jobs/costs?job_id=${job.id}`)
        .then((r) => r.json())
        .then((data) => { setCosts(Array.isArray(data) ? data : []); setCostsLoaded(true) })
        .catch(() => setCostsLoaded(true))
    }
  }, [expanded, costsLoaded, job.id])

  const handleAddCost = async () => {
    if (!newCost.amount || !newCost.category) return
    const res = await authFetch("/api/jobs/costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: job.id, category: newCost.category, description: newCost.description, amount: parseFloat(newCost.amount) }),
    })
    const data = await res.json()
    if (data.id) {
      setCosts((prev) => [...prev, data])
      setNewCost({ category: "Materials", description: "", amount: "" })
    }
  }

  const handleDeleteCost = async (id: string) => {
    await authFetch(`/api/jobs/costs?id=${id}`, { method: "DELETE" })
    setCosts((prev) => prev.filter((c) => c.id !== id))
  }

  const nextStages = NEXT_STAGES[stage] || []

  // Related data for this job
  const contract = related?.contracts[job.id]
  const invoice = related?.invoices[job.id]
  const report = related?.reports[job.id]
  const fuData = related?.followups[job.id]

  const totalCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0)
  const revenue = invoice?.total || 0
  const profit = revenue - totalCosts
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0

  const hasBadges = !!(report || contract || invoice || fuData || job.scheduled_date || job.source === "widget")

  return (
    <div
      className={`rounded-xl border bg-card transition-shadow ${
        expanded ? "border-border shadow-md" : "border-border/60 hover:shadow-sm"
      }`}
    >
      {/* Card Face */}
      <div className="cursor-pointer p-3" onClick={onToggle}>
        <div className="flex items-start gap-2.5">
          {/* Avatar with urgency indicator */}
          <div className="relative flex-shrink-0">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold ${config.light} ${config.lightText}`}
            >
              {getInitials(job.customer_name || "?")}
            </div>
            {fuData && fuData.overdue > 0 && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-card" />
            )}
            {fuData && fuData.overdue === 0 && fuData.dueToday > 0 && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-card" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[13px] font-semibold text-foreground truncate">{job.customer_name}</p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {costsLoaded && totalCosts > 0 && (
                  <span className={`text-[10px] font-bold tabular-nums ${margin >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {margin}%
                  </span>
                )}
                {job.budget ? (
                  <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ${job.budget.toLocaleString()}
                  </span>
                ) : null}
                {leadScore && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${SCORE_COLORS[Math.round(leadScore.score)] || SCORE_COLORS[3]}`}
                    title={leadScore.factors.join(", ")}
                  >
                    {leadScore.score.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{job.address}</p>
          </div>
        </div>

        {/* Status badges row */}
        {hasBadges && (
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {report?.sent && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText className="h-2.5 w-2.5" /> Estimate Sent
              </span>
            )}
            {report && !report.sent && report.completed && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileText className="h-2.5 w-2.5" /> Estimate Ready
              </span>
            )}
            {contract?.signed && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <PenTool className="h-2.5 w-2.5" /> Signed
              </span>
            )}
            {contract && !contract.signed && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <PenTool className="h-2.5 w-2.5" /> Contract Pending
              </span>
            )}
            {invoice && invoice.count > 0 && invoice.paidCount === invoice.count && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Receipt className="h-2.5 w-2.5" /> Paid
              </span>
            )}
            {invoice && invoice.count > 0 && invoice.paidCount < invoice.count && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Receipt className="h-2.5 w-2.5" /> {invoice.paidCount}/{invoice.count} Paid
              </span>
            )}
            {job.scheduled_date && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Calendar className="h-2.5 w-2.5" /> {formatShortDate(job.scheduled_date)}
              </span>
            )}
            {fuData && fuData.overdue > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-red-500/10 text-red-500">
                <AlertCircle className="h-2.5 w-2.5" /> {fuData.overdue} Overdue
              </span>
            )}
          </div>
        )}

        {/* Bottom row: type + source + time */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {job.job_type && (
              <span className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {job.job_type}
              </span>
            )}
            {job.source === "widget" && (
              <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                Widget
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground/60">{timeAgo(job.created_at)}</span>
        </div>

        {/* Time-in-stage bar */}
        <div className="mt-2 h-1 w-full rounded-full bg-secondary/50 overflow-hidden">
          <div
            className={`h-full rounded-full ${stage_info.color} transition-all duration-500`}
            style={{ width: stage_info.width }}
          />
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border/50 px-3 py-3 space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Status Overview */}
          {(report || contract || invoice) && (
            <div className="rounded-lg bg-secondary/30 p-2.5 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1">Status</p>
              {report && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <FileText className="h-3 w-3" /> Estimate
                  </span>
                  <span className={report.sent ? "text-blue-500 font-medium" : report.completed ? "text-emerald-500 font-medium" : "text-muted-foreground/60"}>
                    {report.sent ? "Sent to customer" : report.completed ? "Ready to send" : "Draft"}
                  </span>
                </div>
              )}
              {contract && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <PenTool className="h-3 w-3" /> Contract
                  </span>
                  <span className={contract.signed ? "text-emerald-500 font-medium" : "text-amber-500 font-medium"}>
                    {contract.signed ? "Signed" : contract.status === "pending_customer" ? "Awaiting signature" : "Draft"}
                  </span>
                </div>
              )}
              {invoice && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Receipt className="h-3 w-3" /> Invoices
                  </span>
                  <span className={invoice.paidCount === invoice.count ? "text-emerald-500 font-medium" : "text-amber-500 font-medium"}>
                    {invoice.paidCount}/{invoice.count} paid · ${invoice.paid.toLocaleString()} / ${invoice.total.toLocaleString()}
                  </span>
                </div>
              )}
              {job.scheduled_date && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" /> Scheduled
                  </span>
                  <span className="text-blue-500 font-medium">{formatShortDate(job.scheduled_date)}</span>
                </div>
              )}
            </div>
          )}

          {/* Quick Contact + Actions */}
          <div className="flex flex-wrap gap-2">
            {job.customer_phone && (
              <a
                href={`tel:${job.customer_phone}`}
                className="flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <Phone className="h-3 w-3" /> Call
              </a>
            )}
            {job.customer_email && (
              <a
                href={`mailto:${job.customer_email}`}
                className="flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <Mail className="h-3 w-3" /> Email
              </a>
            )}
            {canEdit && (
              <a
                href={`/contractor/work-orders?job=${job.id}`}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <CheckCircle className="h-3 w-3" /> Work Order
              </a>
            )}
          </div>

          {/* Move Stage */}
          {canEdit && nextStages.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Move to</p>
              <div className="flex flex-wrap gap-1.5">
                {nextStages.map((s) => {
                  const targetConfig = STAGE_CONFIG[s]
                  return (
                    <button
                      key={s}
                      onClick={() => onMoveStage(job.id, s)}
                      disabled={movingJob === job.id}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 ${targetConfig.light} ${targetConfig.lightText}`}
                    >
                      {s}
                      <ArrowRight className="h-3 w-3 opacity-40" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {loadingDetails ? (
            <div className="flex items-center gap-2 py-3">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <span className="text-[11px] text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <>
              {/* Follow-ups */}
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                  <Clock className="h-3 w-3" /> Follow-ups
                </p>
                {followups.filter((f) => !f.completed).length > 0 && (
                  <div className="space-y-1 mb-2">
                    {followups.filter((f) => !f.completed).map((f) => {
                      const urgency = followupUrgency(f.due_date)
                      return (
                        <div key={f.id} className="flex items-center gap-1.5 rounded-md bg-secondary/40 px-2 py-1.5">
                          <button onClick={() => onCompleteFollowup(f.id)} className="text-muted-foreground hover:text-emerald-500 transition-colors flex-shrink-0">
                            <CheckCircle className="h-3 w-3" />
                          </button>
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${urgency.dot}`} />
                          <span className={`text-[10px] font-semibold ${urgency.color}`}>{urgency.label}</span>
                          {f.note && <span className="text-[10px] text-muted-foreground/60 truncate">— {f.note}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={followupDays}
                    onChange={(e) => onSetFollowupDays(e.target.value)}
                    placeholder="Days"
                    className="w-12 rounded-md border border-border/50 bg-background px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <input
                    value={followupNote}
                    onChange={(e) => onSetFollowupNote(e.target.value)}
                    placeholder="Note..."
                    className="flex-1 rounded-md border border-border/50 bg-background px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    onClick={onAddFollowup}
                    disabled={!followupDays}
                    className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Activity */}
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                  <MessageSquare className="h-3 w-3" /> Activity
                </p>
                <div className="flex items-center gap-1 mb-2">
                  <select
                    value={newActivity.type}
                    onChange={(e) => onSetNewActivity({ ...newActivity, type: e.target.value })}
                    className="rounded-md border border-border/50 bg-background px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    value={newActivity.content}
                    onChange={(e) => onSetNewActivity({ ...newActivity, content: e.target.value })}
                    placeholder="Log activity..."
                    className="flex-1 rounded-md border border-border/50 bg-background px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                    onKeyDown={(e) => e.key === "Enter" && onAddActivity()}
                  />
                  <button
                    onClick={onAddActivity}
                    disabled={!newActivity.content.trim()}
                    className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    Log
                  </button>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {activities.length > 0 ? (
                    activities.map((a) => (
                      <div key={a.id} className="flex items-start gap-1.5 rounded-md bg-secondary/30 px-2 py-1">
                        <span className="mt-0.5 flex-shrink-0 text-muted-foreground/40">{activityIcon(a.type)}</span>
                        <span className="text-[10px] text-foreground/70 flex-1">{a.content}</span>
                        <span className="text-[9px] text-muted-foreground/30 flex-shrink-0">{timeAgo(a.created_at)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-muted-foreground/30 text-center py-1">No activity yet</p>
                  )}
                </div>
              </div>

              {/* Profit Tracking */}
              <div>
                <button
                  onClick={() => setShowCosts(!showCosts)}
                  className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <TrendingUp className="h-3 w-3" /> Job Costs & Profit
                  <ChevronDown className={`h-3 w-3 transition-transform ${showCosts ? "rotate-180" : ""}`} />
                </button>

                {showCosts && (
                  <div className="space-y-2">
                    {/* Profit summary */}
                    {(revenue > 0 || totalCosts > 0) && (
                      <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-secondary/30 p-2">
                        <div className="text-center">
                          <p className="text-[9px] text-muted-foreground">Revenue</p>
                          <p className="text-[11px] font-bold text-emerald-500">${revenue.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-muted-foreground">Costs</p>
                          <p className="text-[11px] font-bold text-red-400">${totalCosts.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-muted-foreground">Margin</p>
                          <p className={`text-[11px] font-bold ${margin >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {margin}%
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Cost list */}
                    {costs.length > 0 && (
                      <div className="space-y-1">
                        {costs.map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-2 py-1">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="rounded bg-secondary px-1 py-0.5 text-[9px] font-bold text-muted-foreground">{c.category}</span>
                              {c.description && <span className="text-[10px] text-muted-foreground/60 truncate">{c.description}</span>}
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <span className="text-[11px] font-bold text-foreground">${Number(c.amount).toLocaleString()}</span>
                              {canEdit && (
                                <button onClick={() => handleDeleteCost(c.id)} className="text-muted-foreground/40 hover:text-red-400 transition-colors">
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add cost form */}
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <select
                          value={newCost.category}
                          onChange={(e) => setNewCost({ ...newCost, category: e.target.value })}
                          className="rounded-md border border-border/50 bg-background px-1 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                        >
                          {COST_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <input
                          value={newCost.description}
                          onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                          placeholder="Desc..."
                          className="flex-1 rounded-md border border-border/50 bg-background px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <input
                          type="number"
                          value={newCost.amount}
                          onChange={(e) => setNewCost({ ...newCost, amount: e.target.value })}
                          placeholder="$"
                          className="w-16 rounded-md border border-border/50 bg-background px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <button
                          onClick={handleAddCost}
                          disabled={!newCost.amount}
                          className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
