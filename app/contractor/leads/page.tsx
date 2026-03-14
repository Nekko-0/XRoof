"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import { useRole } from "@/lib/role-context"
import { useToast } from "@/lib/toast-context"
import { MapPin, DollarSign, FileText, Phone, MessageSquare, Home as HomeIcon, CheckCircle, ScrollText, RotateCcw, Plus, EyeOff, Eye, Trash2, Star, Camera, Receipt, Download, Copy, Send, ExternalLink, Mail, X, ChevronDown, ChevronUp, ImagePlus, Search, Filter, TrendingUp } from "lucide-react"
import { PhotoGallery } from "@/components/photo-gallery"
import { InsuranceClaimPanel } from "@/components/insurance-claim-panel"
import { ActivityTimeline } from "@/components/activity-timeline"
import { JobCostEntry } from "@/components/job-cost-entry"
import { StatusBadge } from "@/components/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { exportCSV, exportQuickBooksCSV } from "@/lib/csv-export"

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
  source?: string
  source_detail?: string
}

type FilterTab = "All" | "Accepted" | "Completed" | "Hidden"
type SortOption = "newest" | "oldest" | "budget_high" | "budget_low" | "name_az"

export default function MyJobsPage() {
  const { accountId, role: teamRole } = useRole()
  const toast = useToast()
  const canEdit = teamRole !== "viewer"
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [reopening, setReopening] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [hiddenJobs, setHiddenJobs] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<FilterTab>("All")
  const [jobCosts, setJobCosts] = useState<Record<string, number>>({})

  // Advanced filters
  const [searchText, setSearchText] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [filterJobType, setFilterJobType] = useState("")
  const [filterZip, setFilterZip] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [expandedPhotos, setExpandedPhotos] = useState<string | null>(null)
  const [reviewModal, setReviewModal] = useState<{ jobId: string; customerName: string } | null>(null)
  const [reviewEmail, setReviewEmail] = useState("")
  const [sendingReview, setSendingReview] = useState(false)
  const [googleReviewUrl, setGoogleReviewUrl] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [companyLogo, setCompanyLogo] = useState("")
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const PAGE_SIZE = 50
  const [newLead, setNewLead] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
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
      toast.error("Error deleting lead: " + error.message)
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

    // Use accountId for team members (owner's ID), fallback to own ID
    const contractorId = accountId || user.id

    // Fetch profile for google review URL and company name
    const { data: profile } = await supabase
      .from("profiles")
      .select("google_review_url, company_name, logo_url")
      .eq("id", contractorId)
      .single()
    if (profile?.google_review_url) setGoogleReviewUrl(profile.google_review_url)
    if (profile?.company_name) setCompanyName(profile.company_name)
    if (profile?.logo_url) setCompanyLogo(profile.logo_url)

    const { data: jobsRaw } = await supabase
      .from("jobs")
      .select("id, address, zip_code, job_type, description, budget, status, created_at, customer_name, customer_phone, photo_urls, signature_url, signed_at, source")
      .eq("contractor_id", contractorId)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1)

    setJobs(jobsRaw || [])
    setHasMore((jobsRaw?.length || 0) >= PAGE_SIZE)

    // Fetch aggregated costs per job
    if (jobsRaw && jobsRaw.length > 0) {
      const { data: costRows } = await supabase
        .from("job_costs")
        .select("job_id, amount")
        .in("job_id", jobsRaw.map((j: any) => j.id))
      if (costRows) {
        const costMap: Record<string, number> = {}
        for (const c of costRows) {
          costMap[c.job_id] = (costMap[c.job_id] || 0) + Number(c.amount)
        }
        setJobCosts(costMap)
      }
    }

    setLoading(false)
  }

  useEffect(() => { fetchJobs() }, [accountId])

  const handleAddLead = async () => {
    if (!newLead.customer_name || !newLead.address || !newLead.zip_code || !newLead.job_type) {
      toast.error("Please fill in customer name, address, zip code, and job type")
      return
    }
    if (!userId) return

    setSaving(true)
    const contractorId = accountId || userId
    const { data: insertedJob, error } = await supabase.from("jobs").insert({
      customer_name: newLead.customer_name,
      customer_phone: newLead.customer_phone,
      customer_email: newLead.customer_email || null,
      address: newLead.address,
      zip_code: newLead.zip_code,
      job_type: newLead.job_type,
      description: newLead.description,
      budget: newLead.budget ? Number(newLead.budget) : null,
      status: "Accepted",
      contractor_id: contractorId,
      source: "manual",
    }).select("id").single()

    // Auto-create customer record if not already exists
    if (!error && newLead.customer_name) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("contractor_id", contractorId)
        .eq("name", newLead.customer_name)
        .limit(1)
      if (!existing || existing.length === 0) {
        await supabase.from("customers").insert({
          contractor_id: contractorId,
          name: newLead.customer_name,
          phone: newLead.customer_phone || null,
          email: newLead.customer_email || null,
          address: newLead.address || null,
        }).catch(() => {})
      }
    }

    if (error) {
      toast.error("Error adding lead: " + error.message)
    } else {
      // Fire new_lead automation trigger
      if (insertedJob?.id) {
        authFetch("/api/automations/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trigger: "new_lead", job_id: insertedJob.id, contractor_id: accountId || userId }),
        }).catch(() => {})
      }

      // Notify admin
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
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

      setNewLead({ customer_name: "", customer_phone: "", customer_email: "", address: "", zip_code: "", job_type: "", description: "", budget: "" })
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
      .update({ status: "Completed", completed_at: new Date().toISOString() })
      .eq("id", jobId)

    if (error) {
      toast.error("Error: " + error.message)
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
      .update({ status: "Accepted", completed_at: null })
      .eq("id", jobId)

    if (error) {
      toast.error("Error: " + error.message)
    } else {
      setJobs(jobs.map((j) => j.id === jobId ? { ...j, status: "Accepted" } : j))
    }
    setReopening(null)
  }

  const loadMore = async () => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    const contractorId = accountId || userId
    const { data: moreJobs } = await supabase
      .from("jobs")
      .select("id, address, zip_code, job_type, description, budget, status, created_at, customer_name, customer_phone, photo_urls, signature_url, signed_at, source")
      .eq("contractor_id", contractorId!)
      .order("created_at", { ascending: false })
      .range(jobs.length, jobs.length + PAGE_SIZE - 1)
    if (moreJobs && moreJobs.length > 0) {
      setJobs(prev => [...prev, ...moreJobs])
      setHasMore(moreJobs.length >= PAGE_SIZE)
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }

  const [sendingInvoice, setSendingInvoice] = useState<string | null>(null)
  const [invoiceModal, setInvoiceModal] = useState<Job | null>(null)
  const [createdPayUrl, setCreatedPayUrl] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    address: "",
    job_type: "",
    amount: "",
    discount: "",
    discountType: "dollar" as "dollar" | "percent",
    scope: "",
    notes: "",
    payment_methods: ["card"] as string[],
    line_items: [] as { description: string; amount: string }[],
    extra_photo_urls: [] as string[],
    logo_url: "" as string,
    show: { customer_name: true, address: true, phone: true, email: false, photos: true } as Record<string, boolean>,
    useMilestones: false,
    milestones: [{ label: "Deposit", percent: "50" }, { label: "On Completion", percent: "50" }] as { label: string; percent: string }[],
  })

  const allPaymentMethods = [
    { id: "card", label: "Card (Stripe)" },
    { id: "check", label: "Check" },
    { id: "cash", label: "Cash" },
    { id: "zelle", label: "Zelle" },
    { id: "venmo", label: "Venmo" },
    { id: "cashapp", label: "Cash App" },
    { id: "ach", label: "Bank Transfer (ACH)" },
  ]

  const openInvoiceModal = (job: Job) => {
    if (!job.budget) {
      toast.error("Please set a budget/amount on this job before sending an invoice.")
      return
    }
    setInvoiceForm({
      customer_name: job.customer_name || "",
      customer_phone: job.customer_phone || "",
      customer_email: "",
      address: job.address || "",
      job_type: job.job_type || "",
      amount: String(job.budget || 0),
      discount: "",
      discountType: "dollar",
      scope: job.description || "",
      notes: "",
      payment_methods: ["card"],
      line_items: [],
      extra_photo_urls: [],
      logo_url: companyLogo,
      show: { customer_name: true, address: true, phone: !!job.customer_phone, email: false, photos: !!(job.photo_urls && job.photo_urls.length > 0) },
      useMilestones: false,
      milestones: [{ label: "Deposit", percent: "50" }, { label: "On Completion", percent: "50" }],
    })
    setCreatedPayUrl(null)
    setLinkCopied(false)
    setInvoiceModal(job)
  }

  const togglePaymentMethod = (method: string) => {
    setInvoiceForm((prev) => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(method)
        ? prev.payment_methods.filter((m) => m !== method)
        : [...prev.payment_methods, method],
    }))
  }

  const handleSendInvoice = async () => {
    if (!invoiceModal || !userId) return
    const amountNum = parseFloat(invoiceForm.amount)
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid amount.")
      return
    }
    if (invoiceForm.payment_methods.length === 0) {
      toast.error("Please select at least one payment method.")
      return
    }

    const discountRaw = parseFloat(invoiceForm.discount) || 0
    const discountDollars = invoiceForm.discountType === "percent"
      ? amountNum * (discountRaw / 100)
      : discountRaw

    setSendingInvoice(invoiceModal.id)
    try {
      const res = await authFetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractor_id: userId,
          job_id: invoiceModal.id,
          customer_name: invoiceForm.customer_name,
          customer_phone: invoiceForm.customer_phone || null,
          customer_email: invoiceForm.customer_email || null,
          address: invoiceForm.address,
          job_type: invoiceForm.job_type,
          amount: Math.round(amountNum * 100), // dollars to cents
          discount: Math.round(discountDollars * 100), // dollars to cents
          scope: invoiceForm.scope || null,
          notes: invoiceForm.notes || null,
          payment_methods: invoiceForm.payment_methods,
          line_items: invoiceForm.line_items
            .filter((li) => li.description.trim())
            .map((li) => ({ description: li.description, amount: Math.round((parseFloat(li.amount) || 0) * 100) })),
          extra_photo_urls: invoiceForm.extra_photo_urls,
          logo_url: invoiceForm.logo_url || null,
          hidden_fields: Object.entries(invoiceForm.show).filter(([, v]) => !v).map(([k]) => k),
          milestones: invoiceForm.useMilestones ? invoiceForm.milestones.map((m) => {
            const pct = parseFloat(m.percent) || 0
            return { label: m.label, percent: pct, amount: Math.round(amountNum * 100 * pct / 100), paid: false, due: false }
          }).map((m, i) => ({ ...m, due: i === 0 })) : [],
        }),
      })

      const data = await res.json()
      if (data.error) {
        toast.error("Error creating invoice: " + data.error)
      } else {
        const payUrl = `${window.location.origin}/pay/${data.id}`
        setCreatedPayUrl(payUrl)
      }
    } catch {
      toast.error("Failed to create invoice")
    }
    setSendingInvoice(null)
  }

  const handleExportCSV = () => {
    const completedJobs = jobs.filter((j) => j.status === "Completed")
    if (completedJobs.length === 0) { toast.error("No completed jobs to export"); return }

    exportQuickBooksCSV(
      completedJobs.map((j) => {
        const costs = jobCosts[j.id] || 0
        const revenue = j.budget || 0
        const profit = revenue - costs
        return {
          date: new Date(j.created_at).toLocaleDateString(),
          number: `INV-${j.id.slice(0, 8).toUpperCase()}`,
          customer: j.customer_name,
          amount: revenue,
          costs,
          profit,
          status: j.status,
        }
      })
    )
    toast.success("QuickBooks CSV exported")
  }

  const handleSendReview = async () => {
    if (!reviewModal || !reviewEmail || !googleReviewUrl) return
    setSendingReview(true)
    try {
      const res = await authFetch("/api/reviews/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: reviewModal.jobId,
          customer_email: reviewEmail,
          customer_name: reviewModal.customerName,
          company_name: companyName,
          google_review_url: googleReviewUrl,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error("Error: " + data.error)
      } else {
        toast.success("Review request sent to " + reviewEmail + "!")
        setReviewModal(null)
        setReviewEmail("")
      }
    } catch {
      toast.error("Failed to send review request.")
    }
    setSendingReview(false)
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

  // Get unique job types for filter dropdown
  const jobTypes = [...new Set(jobs.map((j) => j.job_type).filter(Boolean))]

  // Filter jobs based on active tab + advanced filters
  const filteredJobs = jobs.filter((job) => {
    // Tab filter
    if (activeTab === "Hidden") return hiddenJobs.has(job.id)
    if (activeTab === "Accepted") { if (job.status !== "Accepted" || hiddenJobs.has(job.id)) return false }
    else if (activeTab === "Completed") { if (job.status !== "Completed" || hiddenJobs.has(job.id)) return false }
    else { if (hiddenJobs.has(job.id)) return false }

    // Text search
    if (searchText) {
      const q = searchText.toLowerCase()
      if (
        !job.customer_name?.toLowerCase().includes(q) &&
        !job.address?.toLowerCase().includes(q) &&
        !job.customer_phone?.includes(q)
      ) return false
    }

    // Job type filter
    if (filterJobType && job.job_type !== filterJobType) return false

    // Zip filter
    if (filterZip && !job.zip_code?.includes(filterZip)) return false

    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case "budget_high": return (b.budget || 0) - (a.budget || 0)
      case "budget_low": return (a.budget || 0) - (b.budget || 0)
      case "name_az": return (a.customer_name || "").localeCompare(b.customer_name || "")
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const hiddenCount = jobs.filter((j) => hiddenJobs.has(j.id)).length

  if (loading) return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Skeleton className="h-8 w-48" />
      {/* Filter bar */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      {/* Job cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-3 w-48" />
        </div>
      ))}
    </div>
  )

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

      {/* Filter Tabs + Export */}
      <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1 rounded-xl bg-secondary/50 p-1">
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
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Export completed jobs as CSV (Quickbooks compatible)"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
      </div>

      {/* Search & Sort */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search name, address, phone..."
            className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
          />
          {searchText && (
            <button onClick={() => setSearchText("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="budget_high">Budget ↓</option>
          <option value="budget_low">Budget ↑</option>
          <option value="name_az">Name A-Z</option>
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
            showFilters || filterJobType || filterZip
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          Filters{(filterJobType || filterZip) ? " ●" : ""}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Job Type</label>
            <select
              value={filterJobType}
              onChange={(e) => setFilterJobType(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
            >
              <option value="">All Types</option>
              {jobTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Zip Code</label>
            <input
              value={filterZip}
              onChange={(e) => setFilterZip(e.target.value)}
              placeholder="e.g. 60601"
              className="w-24 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none"
            />
          </div>
          {(filterJobType || filterZip) && (
            <button
              onClick={() => { setFilterJobType(""); setFilterZip("") }}
              className="mt-4 text-[10px] font-bold text-primary hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      <p className="text-[11px] text-muted-foreground">
        Showing {filteredJobs.length} of {jobs.length} leads{hasMore ? "+" : ""}
        {searchText && ` matching "${searchText}"`}
      </p>

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
              <label className="mb-1 block text-xs font-medium text-foreground">Email</label>
              <input
                type="email"
                value={newLead.customer_email}
                onChange={(e) => setNewLead({ ...newLead, customer_email: e.target.value })}
                placeholder="customer@email.com"
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
                <option value="Insurance Claim">Insurance Claim</option>
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
                    {job.source && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        job.source === "widget" ? "bg-blue-500/15 text-blue-400" :
                        job.source === "manual" ? "bg-emerald-500/15 text-emerald-400" :
                        job.source === "referral" ? "bg-primary/15 text-primary" :
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {job.source}
                      </span>
                    )}
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

                {/* Insurance Claim Panel */}
                {(job.job_type === "Storm Damage" || job.job_type === "Insurance Claim") && (
                  <div className="mb-3">
                    <InsuranceClaimPanel jobId={job.id} />
                  </div>
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
                    {jobCosts[job.id] > 0 && job.budget && (() => {
                      const costs = jobCosts[job.id]
                      const profit = job.budget - costs
                      const margin = Math.round((profit / job.budget) * 100)
                      return (
                        <span className={`flex items-center gap-1 text-xs font-semibold ${margin >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          <TrendingUp className="h-3.5 w-3.5" />
                          {margin}% margin
                        </span>
                      )
                    })()}
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
                    <button
                      onClick={() => setExpandedPhotos(expandedPhotos === job.id ? null : job.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        expandedPhotos === job.id
                          ? "bg-blue-900/30 text-blue-400 border border-blue-700"
                          : "border border-border bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Photos
                    </button>
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
                      <>
                        <button
                          onClick={() => openInvoiceModal(job)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          Invoice
                        </button>
                        <button
                          onClick={() => setReviewModal({ jobId: job.id, customerName: job.customer_name })}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Review
                        </button>
                        <button
                          onClick={() => handleReopen(job.id)}
                          disabled={reopening === job.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {reopening === job.id ? "..." : "Reopen"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expandable Photo Gallery */}
                {expandedPhotos === job.id && userId && (
                  <div className="mt-3 rounded-xl border border-border bg-secondary/10 p-3">
                    <PhotoGallery jobId={job.id} contractorId={userId} />
                  </div>
                )}

                {/* Activity Timeline */}
                <div className="mt-3 rounded-xl border border-border bg-secondary/10 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity</p>
                  <ActivityTimeline jobId={job.id} />
                </div>

                {/* Job Costs & Profit */}
                <div className="mt-3 rounded-xl border border-border bg-secondary/10 p-3">
                  <JobCostEntry
                    jobId={job.id}
                    revenue={job.budget || 0}
                    canEdit={canEdit}
                    onCostsChange={(total) => setJobCosts((prev) => ({ ...prev, [job.id]: total }))}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Invoice Preview Modal */}
      {invoiceModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-8 sm:pt-16">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold text-foreground">Invoice Preview</h3>
            <p className="mb-4 text-sm text-muted-foreground">Review and edit before sending</p>

            {/* Company Brand / Logo */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Brand (optional)</label>
              <div className="flex items-center gap-3">
                {invoiceForm.logo_url ? (
                  <div className="relative group">
                    <img src={invoiceForm.logo_url} alt="Logo" className="h-14 w-14 rounded-xl object-cover border border-border" />
                    <button type="button"
                      onClick={() => setInvoiceForm((prev) => ({ ...prev, logo_url: "" }))}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    ><X className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    <ImagePlus className="h-5 w-5" />
                    <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                      if (!e.target.files?.[0] || !userId) return
                      const file = e.target.files[0]
                      const ext = file.name.split(".").pop()
                      const path = `logos/${userId}/${Date.now()}.${ext}`
                      const { error } = await supabase.storage.from("job-photos").upload(path, file)
                      if (!error) {
                        const { data: pub } = supabase.storage.from("job-photos").getPublicUrl(path)
                        setInvoiceForm((prev) => ({ ...prev, logo_url: pub.publicUrl }))
                      }
                    }} />
                  </label>
                )}
                <div className="text-xs text-muted-foreground">
                  {invoiceForm.logo_url ? "Logo will appear on the invoice header" : "Upload your company logo (shows in invoice header)"}
                </div>
              </div>
            </div>

            {/* Customer Info with toggles */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Info</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Name</span>
                    <button type="button" onClick={() => setInvoiceForm({ ...invoiceForm, show: { ...invoiceForm.show, customer_name: !invoiceForm.show.customer_name } })}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${invoiceForm.show.customer_name ? "text-primary" : "text-muted-foreground"}`}
                    >{invoiceForm.show.customer_name ? "Visible" : "Hidden"}</button>
                  </div>
                  <input value={invoiceForm.customer_name} onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_name: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Phone</span>
                    <button type="button" onClick={() => setInvoiceForm({ ...invoiceForm, show: { ...invoiceForm.show, phone: !invoiceForm.show.phone } })}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${invoiceForm.show.phone ? "text-primary" : "text-muted-foreground"}`}
                    >{invoiceForm.show.phone ? "Visible" : "Hidden"}</button>
                  </div>
                  <input value={invoiceForm.customer_phone} onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_phone: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Email</span>
                    <button type="button" onClick={() => setInvoiceForm({ ...invoiceForm, show: { ...invoiceForm.show, email: !invoiceForm.show.email } })}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${invoiceForm.show.email ? "text-primary" : "text-muted-foreground"}`}
                    >{invoiceForm.show.email ? "Visible" : "Hidden"}</button>
                  </div>
                  <input type="email" value={invoiceForm.customer_email} onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_email: e.target.value })}
                    placeholder="customer@email.com"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Address</span>
                    <button type="button" onClick={() => setInvoiceForm({ ...invoiceForm, show: { ...invoiceForm.show, address: !invoiceForm.show.address } })}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${invoiceForm.show.address ? "text-primary" : "text-muted-foreground"}`}
                    >{invoiceForm.show.address ? "Visible" : "Hidden"}</button>
                  </div>
                  <input value={invoiceForm.address} onChange={(e) => setInvoiceForm({ ...invoiceForm, address: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            </div>

            {/* Job + Amount */}
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Job Type</label>
                <input value={invoiceForm.job_type} onChange={(e) => setInvoiceForm({ ...invoiceForm, job_type: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Amount ($)</label>
                <input type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>

            {/* Materials / Line Items */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Materials / Line Items</label>
                <button type="button"
                  onClick={() => setInvoiceForm({ ...invoiceForm, line_items: [...invoiceForm.line_items, { description: "", amount: "" }] })}
                  className="text-xs font-semibold text-primary hover:text-primary/80"
                >+ Add Item</button>
              </div>
              {invoiceForm.line_items.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No line items added. Click &quot;+ Add Item&quot; to itemize materials.</p>
              ) : (
                <div className="space-y-2">
                  {invoiceForm.line_items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        value={item.description}
                        onChange={(e) => {
                          const items = [...invoiceForm.line_items]
                          items[i] = { ...items[i], description: e.target.value }
                          setInvoiceForm({ ...invoiceForm, line_items: items })
                        }}
                        placeholder="e.g. Architectural Shingles"
                        className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => {
                          const items = [...invoiceForm.line_items]
                          items[i] = { ...items[i], amount: e.target.value }
                          setInvoiceForm({ ...invoiceForm, line_items: items })
                        }}
                        placeholder="$"
                        className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button type="button"
                        onClick={() => setInvoiceForm({ ...invoiceForm, line_items: invoiceForm.line_items.filter((_, j) => j !== i) })}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      ><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discount */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Discount</label>
              <div className="flex gap-2">
                <div className="flex rounded-xl border border-border overflow-hidden">
                  <button type="button" onClick={() => setInvoiceForm({ ...invoiceForm, discountType: "dollar" })}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${invoiceForm.discountType === "dollar" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"}`}
                  >$</button>
                  <button type="button" onClick={() => setInvoiceForm({ ...invoiceForm, discountType: "percent" })}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${invoiceForm.discountType === "percent" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"}`}
                  >%</button>
                </div>
                <input type="number" value={invoiceForm.discount} onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: e.target.value })} placeholder="0"
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>

            {/* Amount Summary */}
            {(() => {
              const amt = parseFloat(invoiceForm.amount) || 0
              const lineItemsTotal = invoiceForm.line_items.reduce((sum, li) => sum + (parseFloat(li.amount) || 0), 0)
              const itemizedTotal = amt + lineItemsTotal
              const discRaw = parseFloat(invoiceForm.discount) || 0
              const discDollars = invoiceForm.discountType === "percent" ? itemizedTotal * (discRaw / 100) : discRaw
              const total = Math.max(0, itemizedTotal - discDollars)
              return (
                <div className="mb-4 rounded-xl bg-secondary/50 px-4 py-3 flex flex-col gap-1">
                  {(lineItemsTotal > 0 || discRaw > 0) && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal {lineItemsTotal > 0 ? `(base + ${invoiceForm.line_items.filter(li => li.description.trim()).length} items)` : ""}</span>
                      <span>${itemizedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {discRaw > 0 && (
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>Discount {invoiceForm.discountType === "percent" ? `(${discRaw}%)` : ""}</span>
                      <span>-${discDollars.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-foreground">
                    <span>Total</span>
                    <span>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )
            })()}

            {/* Photos */}
            <div className="mb-4">
              {invoiceModal.photo_urls && invoiceModal.photo_urls.length > 0 && (
                <div className="mb-3 flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Include Job Photos</p>
                    <p className="text-xs text-muted-foreground">{invoiceModal.photo_urls.length} photo{invoiceModal.photo_urls.length > 1 ? "s" : ""} from this job</p>
                  </div>
                  <button type="button"
                    onClick={() => setInvoiceForm({ ...invoiceForm, show: { ...invoiceForm.show, photos: !invoiceForm.show.photos } })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${invoiceForm.show.photos ? "bg-primary" : "bg-border"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${invoiceForm.show.photos ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              )}
              {/* Extra photos upload */}
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Add Photos
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={async (e) => {
                    if (!e.target.files || !userId) return
                    const files = Array.from(e.target.files)
                    const urls: string[] = []
                    for (const file of files) {
                      const ext = file.name.split(".").pop()
                      const path = `invoice-photos/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                      const { error } = await supabase.storage.from("job-photos").upload(path, file)
                      if (!error) {
                        const { data: pub } = supabase.storage.from("job-photos").getPublicUrl(path)
                        urls.push(pub.publicUrl)
                      }
                    }
                    if (urls.length > 0) {
                      setInvoiceForm((prev) => ({ ...prev, extra_photo_urls: [...prev.extra_photo_urls, ...urls] }))
                    }
                  }} />
                </label>
                {invoiceForm.extra_photo_urls.length > 0 && (
                  <span className="text-xs text-muted-foreground">{invoiceForm.extra_photo_urls.length} added</span>
                )}
              </div>
              {invoiceForm.extra_photo_urls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {invoiceForm.extra_photo_urls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="h-14 w-14 rounded-lg object-cover border border-border" />
                      <button type="button"
                        onClick={() => setInvoiceForm((prev) => ({ ...prev, extra_photo_urls: prev.extra_photo_urls.filter((_, j) => j !== i) }))}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      ><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scope of Work */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Scope of Work (optional)</label>
              <textarea value={invoiceForm.scope} onChange={(e) => setInvoiceForm({ ...invoiceForm, scope: e.target.value })}
                placeholder="Describe the work being invoiced..."
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
              <textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                placeholder="Any additional notes for the customer..."
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>

            {/* Payment Methods */}
            <div className="mb-0">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accepted Payment Methods</label>
              <div className="grid grid-cols-2 gap-2">
                {allPaymentMethods.map((method) => (
                  <label key={method.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      invoiceForm.payment_methods.includes(method.id) ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <input type="checkbox" checked={invoiceForm.payment_methods.includes(method.id)} onChange={() => togglePaymentMethod(method.id)} className="sr-only" />
                    <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      invoiceForm.payment_methods.includes(method.id) ? "border-primary bg-primary" : "border-border"
                    }`}>
                      {invoiceForm.payment_methods.includes(method.id) && (
                        <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {method.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Milestone Payments */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setInvoiceForm((prev) => ({ ...prev, useMilestones: !prev.useMilestones }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${invoiceForm.useMilestones ? "bg-primary" : "bg-secondary"}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${invoiceForm.useMilestones ? "translate-x-5" : "translate-x-1"}`} />
                </button>
                Split into Milestones
              </label>
              {invoiceForm.useMilestones && (
                <div className="flex flex-col gap-2">
                  {invoiceForm.milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={m.label}
                        onChange={(e) => {
                          const updated = [...invoiceForm.milestones]
                          updated[i] = { ...m, label: e.target.value }
                          setInvoiceForm((prev) => ({ ...prev, milestones: updated }))
                        }}
                        placeholder="Label (e.g. Deposit)"
                        className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={m.percent}
                          onChange={(e) => {
                            const updated = [...invoiceForm.milestones]
                            updated[i] = { ...m, percent: e.target.value }
                            setInvoiceForm((prev) => ({ ...prev, milestones: updated }))
                          }}
                          className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none text-center"
                          min="0" max="100"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      {invoiceForm.milestones.length > 2 && (
                        <button
                          onClick={() => setInvoiceForm((prev) => ({ ...prev, milestones: prev.milestones.filter((_, idx) => idx !== i) }))}
                          className="rounded p-1 text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setInvoiceForm((prev) => ({ ...prev, milestones: [...prev.milestones, { label: "", percent: "" }] }))}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-primary"
                  >
                    <Plus className="h-3 w-3" /> Add Milestone
                  </button>
                  {invoiceForm.amount && (
                    <p className="text-[10px] text-muted-foreground">
                      Total: {invoiceForm.milestones.reduce((s, m) => s + (parseFloat(m.percent) || 0), 0)}% — must equal 100%
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions / Created Link */}
            {createdPayUrl ? (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-bold text-emerald-400">Invoice Created!</span>
                </div>
                <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground break-all select-all mb-3">
                  {createdPayUrl}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(createdPayUrl)
                      setLinkCopied(true)
                      setTimeout(() => setLinkCopied(false), 2000)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Copy className="h-4 w-4" />
                    {linkCopied ? "Copied!" : "Copy Link"}
                  </button>
                  {invoiceForm.customer_phone && (
                    <a
                      href={`sms:${invoiceForm.customer_phone}?body=${encodeURIComponent(`Hi ${invoiceForm.customer_name}, here is your invoice: ${createdPayUrl}`)}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500"
                    >
                      <Send className="h-4 w-4" />
                      Send via Text
                    </a>
                  )}
                  <a
                    href={createdPayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Preview
                  </a>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setInvoiceModal(null)}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex gap-2 justify-end">
                <button
                  onClick={() => setInvoiceModal(null)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvoice}
                  disabled={sendingInvoice === invoiceModal.id}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {sendingInvoice === invoiceModal.id ? "Creating..." : "Create Invoice"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load More Leads"}
          </button>
        </div>
      )}

      {/* Review Request Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold text-foreground">Request Google Review</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Send a review request to {reviewModal.customerName || "the customer"}
            </p>

            {!googleReviewUrl ? (
              <div className="mb-4 rounded-lg bg-amber-900/20 border border-amber-700/30 p-3">
                <p className="text-sm text-amber-400">
                  Set your Google Review URL in your <a href="/contractor/profile" className="underline font-semibold">Profile</a> first.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Customer Email</label>
                  <input
                    type="email"
                    value={reviewEmail}
                    onChange={(e) => setReviewEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="mb-4 rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Review link:</p>
                  <p className="text-xs text-foreground break-all">{googleReviewUrl}</p>
                </div>
              </>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setReviewModal(null); setReviewEmail("") }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              {googleReviewUrl && (
                <button
                  onClick={handleSendReview}
                  disabled={sendingReview || !reviewEmail}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {sendingReview ? "Sending..." : "Send Review Request"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
