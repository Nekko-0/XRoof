"use client"

import React, { useEffect, useState } from "react"
import { useRole } from "@/lib/role-context"
import { useToast } from "@/lib/toast-context"
import { authFetch } from "@/lib/auth-fetch"
import { EmptyState } from "@/components/empty-state"
import {
  HardHat, Plus, Trash2, Edit3, Star, Phone, Mail,
  Shield, AlertTriangle, Loader2, X, ChevronDown, ChevronRight,
  Briefcase, Copy, UserCheck, MapPin, Calendar,
} from "lucide-react"

type Subcontractor = {
  id: string
  contractor_id: string
  name: string
  specialty: string | null
  phone: string | null
  email: string | null
  hourly_rate: number | null
  insurance_expiry: string | null
  rating: number | null
  notes: string | null
  created_at: string
}

type JobAssignment = {
  id: string
  assigned_at: string
  notes: string | null
  subcontractor_id: string
  job_id: string
  jobs: {
    id: string
    customer_name: string
    address: string
    status: string
    scheduled_date: string | null
    completed_at: string | null
  } | null
}

type Job = {
  id: string
  customer_name: string
  address: string
  status: string
}

const emptyForm = {
  name: "",
  specialty: "",
  phone: "",
  email: "",
  hourly_rate: "",
  insurance_expiry: "",
  rating: 0,
  notes: "",
}

function insuranceStatus(expiry: string | null): "ok" | "expiring" | "expired" | "none" {
  if (!expiry) return "none"
  const exp = new Date(expiry)
  const now = new Date()
  if (exp < now) return "expired"
  const diff = exp.getTime() - now.getTime()
  if (diff < 30 * 24 * 60 * 60 * 1000) return "expiring"
  return "ok"
}

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
        >
          <Star
            className={`h-4 w-4 ${
              s <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-slate-600"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

const ACTIVE_STATUSES = ["Pending", "Accepted", "Estimate Sent", "Signed"]

export default function SubcontractorsPage() {
  const { accountId } = useRole()
  const toast = useToast()
  const [subs, setSubs] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Job assignments
  const [assignments, setAssignments] = useState<JobAssignment[]>([])
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [activeJobs, setActiveJobs] = useState<Job[]>([])
  const [assignJobId, setAssignJobId] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [unassigning, setUnassigning] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    loadSubs()
    loadAssignments()
    loadActiveJobs()
  }, [accountId])

  const loadSubs = async () => {
    try {
      const res = await authFetch("/api/subcontractors")
      const data = await res.json()
      setSubs(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Failed to load subcontractors")
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async () => {
    try {
      const res = await authFetch("/api/subcontractors/assignments")
      const data = await res.json()
      setAssignments(Array.isArray(data) ? data : [])
    } catch {
      // Silently fail — assignments are supplementary
    }
  }

  const loadActiveJobs = async () => {
    try {
      const res = await authFetch("/api/jobs")
      const data = await res.json()
      const jobs = Array.isArray(data) ? data : data.jobs || []
      setActiveJobs(
        jobs.filter((j: Job) => ACTIVE_STATUSES.includes(j.status))
      )
    } catch {
      // Silently fail
    }
  }

  const getSubAssignments = (subId: string) =>
    assignments.filter((a) => a.subcontractor_id === subId)

  const getActiveAssignmentCount = (subId: string) =>
    getSubAssignments(subId).filter(
      (a) => a.jobs && ACTIVE_STATUSES.includes(a.jobs.status)
    ).length

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowDialog(true)
  }

  const openEdit = (sub: Subcontractor) => {
    setEditingId(sub.id)
    setForm({
      name: sub.name,
      specialty: sub.specialty || "",
      phone: sub.phone || "",
      email: sub.email || "",
      hourly_rate: sub.hourly_rate ? String(sub.hourly_rate) : "",
      insurance_expiry: sub.insurance_expiry || "",
      rating: sub.rating || 0,
      notes: sub.notes || "",
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name.trim(),
        specialty: form.specialty.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        insurance_expiry: form.insurance_expiry || null,
        rating: form.rating || null,
        notes: form.notes.trim() || null,
      }
      const res = await authFetch("/api/subcontractors", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to save")
        return
      }
      toast.success(editingId ? "Subcontractor updated" : "Subcontractor added")
      setShowDialog(false)
      loadSubs()
    } catch {
      toast.error("Failed to save subcontractor")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await authFetch(`/api/subcontractors?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Failed to delete")
        return
      }
      toast.success("Subcontractor deleted")
      setSubs((prev) => prev.filter((s) => s.id !== id))
      setAssignments((prev) => prev.filter((a) => a.subcontractor_id !== id))
      setDeleteConfirm(null)
      if (expandedSub === id) setExpandedSub(null)
    } catch {
      toast.error("Failed to delete subcontractor")
    } finally {
      setDeleting(false)
    }
  }

  const handleAssign = async (subId: string) => {
    if (!assignJobId) return
    setAssigning(true)
    try {
      const res = await authFetch("/api/subcontractors/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: assignJobId, subcontractor_id: subId }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to assign")
        return
      }
      const data = await res.json()
      setAssignments((prev) => [data, ...prev])
      setAssignJobId("")
      toast.success("Assigned to job")
    } catch {
      toast.error("Failed to assign")
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async (assignmentId: string) => {
    setUnassigning(assignmentId)
    try {
      const res = await authFetch(`/api/subcontractors/assignments?id=${assignmentId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        toast.error("Failed to remove assignment")
        return
      }
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
      toast.success("Removed from job")
    } catch {
      toast.error("Failed to remove assignment")
    } finally {
      setUnassigning(null)
    }
  }

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone)
    toast.success("Phone copied")
  }

  // Stats
  const totalActive = subs.length
  const expiredInsurance = subs.filter((s) => insuranceStatus(s.insurance_expiry) === "expired")
  const expiringInsurance = subs.filter((s) => insuranceStatus(s.insurance_expiry) === "expiring")
  const assignedCount = subs.filter((s) => getActiveAssignmentCount(s.id) > 0).length

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Subcontractors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your subcontractor network and job assignments
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Subcontractor
        </button>
      </div>

      {/* Stats Bar */}
      {subs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-bold text-foreground">{totalActive}</div>
            <div className="text-xs text-muted-foreground">Total Subs</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-bold text-blue-400">{assignedCount}</div>
            <div className="text-xs text-muted-foreground">On Active Jobs</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className={`text-2xl font-bold ${expiringInsurance.length > 0 ? "text-amber-400" : "text-foreground"}`}>
              {expiringInsurance.length}
            </div>
            <div className="text-xs text-muted-foreground">Insurance Expiring</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className={`text-2xl font-bold ${expiredInsurance.length > 0 ? "text-red-400" : "text-foreground"}`}>
              {expiredInsurance.length}
            </div>
            <div className="text-xs text-muted-foreground">Insurance Expired</div>
          </div>
        </div>
      )}

      {/* Insurance Alerts */}
      {expiredInsurance.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Expired Insurance
          </div>
          <div className="flex flex-wrap gap-2">
            {expiredInsurance.map((sub) => (
              <span
                key={sub.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-sm text-red-300"
              >
                {sub.name}
                <span className="text-xs text-red-400/70">
                  exp {new Date(sub.insurance_expiry!).toLocaleDateString()}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {expiringInsurance.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-400">
            <Shield className="h-4 w-4" />
            Insurance Expiring Soon (30 days)
          </div>
          <div className="flex flex-wrap gap-2">
            {expiringInsurance.map((sub) => (
              <span
                key={sub.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-sm text-amber-300"
              >
                {sub.name}
                <span className="text-xs text-amber-400/70">
                  exp {new Date(sub.insurance_expiry!).toLocaleDateString()}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {subs.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="No subcontractors yet"
          description="Add your subcontractors to keep track of their info, rates, and insurance."
          actionLabel="Add Subcontractor"
          onAction={openAdd}
        />
      ) : (
        /* Table */
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground md:table-cell">Specialty</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground lg:table-cell">Contact</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground md:table-cell">Rate</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground sm:table-cell">Insurance</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Rating</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Jobs</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => {
                const ins = insuranceStatus(sub.insurance_expiry)
                const isExpanded = expandedSub === sub.id
                const subAssignments = getSubAssignments(sub.id)
                const activeCount = getActiveAssignmentCount(sub.id)
                const activeAssignments = subAssignments.filter(
                  (a) => a.jobs && ACTIVE_STATUSES.includes(a.jobs.status)
                )
                const completedAssignments = subAssignments.filter(
                  (a) => a.jobs && a.jobs.status === "Completed"
                )

                // Jobs already assigned to this sub (for filtering the assign dropdown)
                const assignedJobIds = new Set(subAssignments.map((a) => a.job_id))
                const availableJobs = activeJobs.filter((j) => !assignedJobIds.has(j.id))

                return (
                  <React.Fragment key={sub.id}>
                    <tr
                      className={`border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30 cursor-pointer ${
                        isExpanded ? "bg-muted/20" : ""
                      }`}
                      onClick={() => setExpandedSub(isExpanded ? null : sub.id)}
                    >
                      <td className="px-2 py-3 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{sub.name}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {sub.specialty || "—"}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <div className="flex items-center gap-2">
                          {sub.phone && (
                            <a
                              href={`tel:${sub.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                              title={sub.phone}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {sub.phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                copyPhone(sub.phone!)
                              }}
                              className="text-muted-foreground hover:text-foreground"
                              title="Copy phone"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                          {sub.email && (
                            <a
                              href={`mailto:${sub.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                              title={sub.email}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {sub.hourly_rate ? `$${sub.hourly_rate}/hr` : "—"}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        {ins === "none" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : ins === "expired" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            Expired
                          </span>
                        ) : ins === "expiring" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                            <Shield className="h-3 w-3" />
                            Expiring
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                            <Shield className="h-3 w-3" />
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StarRating value={sub.rating || 0} readonly />
                      </td>
                      <td className="px-4 py-3">
                        {activeCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                            <Briefcase className="h-3 w-3" />
                            {activeCount}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEdit(sub)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          {deleteConfirm === sub.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(sub.id)}
                                disabled={deleting}
                                className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                {deleting ? "..." : "Confirm"}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(sub.id)}
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="border-b border-border/50 bg-muted/10 px-6 py-4">
                          <div className="space-y-4">
                            {/* Mobile contact info */}
                            <div className="flex flex-wrap gap-3 lg:hidden">
                              {sub.phone && (
                                <a
                                  href={`tel:${sub.phone}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/20"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  {sub.phone}
                                </a>
                              )}
                              {sub.email && (
                                <a
                                  href={`mailto:${sub.email}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/20"
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                  {sub.email}
                                </a>
                              )}
                            </div>

                            {/* Notes */}
                            {sub.notes && (
                              <p className="text-sm text-muted-foreground italic">
                                {sub.notes}
                              </p>
                            )}

                            {/* Assign to Job */}
                            {availableJobs.length > 0 && (
                              <div className="flex items-center gap-2">
                                <select
                                  value={assignJobId}
                                  onChange={(e) => setAssignJobId(e.target.value)}
                                  className="flex-1 max-w-md rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                  <option value="">Assign to a job...</option>
                                  {availableJobs.map((job) => (
                                    <option key={job.id} value={job.id}>
                                      {job.customer_name} — {job.address}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleAssign(sub.id)}
                                  disabled={!assignJobId || assigning}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                  {assigning ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <UserCheck className="h-3.5 w-3.5" />
                                  )}
                                  Assign
                                </button>
                              </div>
                            )}

                            {/* Active Jobs */}
                            {activeAssignments.length > 0 && (
                              <div>
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Active Jobs ({activeAssignments.length})
                                </h4>
                                <div className="space-y-1.5">
                                  {activeAssignments.map((a) => (
                                    <div
                                      key={a.id}
                                      className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <Briefcase className="h-4 w-4 flex-shrink-0 text-blue-400" />
                                        <div className="min-w-0">
                                          <div className="text-sm font-medium text-foreground truncate">
                                            {a.jobs?.customer_name}
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{a.jobs?.address}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                                          {a.jobs?.status}
                                        </span>
                                        <button
                                          onClick={() => handleUnassign(a.id)}
                                          disabled={unassigning === a.id}
                                          className="rounded-lg p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                                          title="Remove from job"
                                        >
                                          {unassigning === a.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <X className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Completed Jobs */}
                            {completedAssignments.length > 0 && (
                              <div>
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Job History ({completedAssignments.length})
                                </h4>
                                <div className="space-y-1.5">
                                  {completedAssignments.slice(0, 5).map((a) => (
                                    <div
                                      key={a.id}
                                      className="flex items-center justify-between rounded-lg border border-border/30 bg-card/50 px-3 py-2"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <Briefcase className="h-4 w-4 flex-shrink-0 text-emerald-400/50" />
                                        <div className="min-w-0">
                                          <div className="text-sm text-muted-foreground truncate">
                                            {a.jobs?.customer_name}
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{a.jobs?.address}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                        {a.jobs?.completed_at && (
                                          <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(a.jobs.completed_at).toLocaleDateString()}
                                          </span>
                                        )}
                                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                                          Done
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  {completedAssignments.length > 5 && (
                                    <p className="text-xs text-muted-foreground pl-3">
                                      +{completedAssignments.length - 5} more completed jobs
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* No assignments message */}
                            {subAssignments.length === 0 && availableJobs.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                No job assignments yet. Create jobs first to assign this subcontractor.
                              </p>
                            )}
                            {subAssignments.length === 0 && availableJobs.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                No jobs assigned yet. Use the dropdown above to assign to a job.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2
                className="text-lg font-bold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {editingId ? "Edit Subcontractor" : "Add Subcontractor"}
              </h2>
              <button
                onClick={() => setShowDialog(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Company or person name"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Specialty */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Specialty</label>
                <input
                  type="text"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="e.g. Gutters, Siding, HVAC"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="sub@example.com"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Rate + Insurance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Hourly Rate ($)</label>
                  <input
                    type="number"
                    value={form.hourly_rate}
                    onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                    placeholder="75"
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Insurance Expiry</label>
                  <input
                    type="date"
                    value={form.insurance_expiry}
                    onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Rating</label>
                <StarRating value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any notes about this subcontractor..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowDialog(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
