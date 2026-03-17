"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRole } from "@/lib/role-context"
import { useToast } from "@/lib/toast-context"
import { authFetch } from "@/lib/auth-fetch"
import { EmptyState } from "@/components/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ClipboardList, Plus, X, CheckCircle, Clock, Play,
  AlertTriangle, MapPin, User, Calendar, ChevronDown,
  Trash2, Filter,
} from "lucide-react"

type WorkOrder = {
  id: string
  job_id: string | null
  contractor_id: string
  assigned_to: string | null
  assigned_name: string | null
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string | null
  completed_at: string | null
  created_at: string
  jobs?: { customer_name: string; address: string } | null
}

type TeamMember = {
  id: string
  invited_name: string
  invited_email: string
  role: string
  status: string
}

type Job = {
  id: string
  customer_name: string
  address: string
  status: string
}

const PRIORITIES = [
  { value: "low", label: "Low", color: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/20" },
  { value: "normal", label: "Normal", color: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { value: "high", label: "High", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { value: "urgent", label: "Urgent", color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/20" },
]

const STATUSES = [
  { value: "pending", label: "Pending", icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
  { value: "in_progress", label: "In Progress", icon: Play, color: "text-blue-600", bg: "bg-blue-500/10" },
  { value: "completed", label: "Completed", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-500/10" },
]

type FilterStatus = "all" | "pending" | "in_progress" | "completed"

export default function WorkOrdersPage() {
  const { accountId, role: teamRole } = useRole()
  const toast = useToast()
  const canEdit = teamRole !== "viewer"

  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [saving, setSaving] = useState(false)

  // Form
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "normal",
    job_id: "",
    assigned_to: "",
    assigned_name: "",
    due_date: "",
  })

  useEffect(() => {
    if (!accountId) return
    const load = async () => {
      const [ordersRes, teamRes, jobsRes] = await Promise.all([
        authFetch(`/api/work-orders?contractor_id=${accountId}`).then((r) => r.json()),
        authFetch(`/api/team?account_id=${accountId}`).then((r) => r.json()),
        supabase.from("jobs")
          .select("id, customer_name, address, status")
          .eq("contractor_id", accountId)
          .not("status", "in", '("Completed","Lost")')
          .order("created_at", { ascending: false })
          .limit(100),
      ])

      setOrders(Array.isArray(ordersRes) ? ordersRes : [])
      setTeamMembers((Array.isArray(teamRes) ? teamRes : []).filter((m: TeamMember) => m.status === "active"))
      setJobs(jobsRes.data || [])
      setLoading(false)
    }
    load()
  }, [accountId])

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return }
    setSaving(true)

    const res = await authFetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        contractor_id: accountId,
        job_id: form.job_id || null,
        assigned_to: form.assigned_to || null,
        assigned_name: form.assigned_name || null,
        due_date: form.due_date || null,
      }),
    })

    const data = await res.json()
    if (data.error) {
      toast.error(data.error)
    } else {
      setOrders((prev) => [data, ...prev])
      setForm({ title: "", description: "", priority: "normal", job_id: "", assigned_to: "", assigned_name: "", due_date: "" })
      setShowForm(false)
      toast.success("Work order created")
    }
    setSaving(false)
  }

  const handleStatusChange = async (id: string, status: string) => {
    const res = await authFetch("/api/work-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    const data = await res.json()
    if (data.error) {
      toast.error(data.error)
    } else {
      setOrders((prev) => prev.map((o) => o.id === id ? data : o))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this work order?")) return
    await authFetch(`/api/work-orders?id=${id}`, { method: "DELETE" })
    setOrders((prev) => prev.filter((o) => o.id !== id))
    toast.success("Work order deleted")
  }

  const handleAssigneeChange = (memberId: string) => {
    const member = teamMembers.find((m) => m.id === memberId)
    setForm({
      ...form,
      assigned_to: memberId,
      assigned_name: member?.invited_name || "",
    })
  }

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === "all") return o.status !== "cancelled"
    return o.status === filterStatus
  })

  const counts = {
    pending: orders.filter((o) => o.status === "pending").length,
    in_progress: orders.filter((o) => o.status === "in_progress").length,
    completed: orders.filter((o) => o.status === "completed").length,
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Work Orders
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Assign and track tasks for your crew
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "New Order"}
          </button>
        )}
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-3">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(filterStatus === s.value as FilterStatus ? "all" : s.value as FilterStatus)}
            className={`rounded-xl border p-3 text-center transition-colors ${
              filterStatus === s.value
                ? `${s.bg} border-current ${s.color}`
                : "border-border bg-card hover:bg-secondary/30"
            }`}
          >
            <p className={`text-2xl font-bold ${filterStatus === s.value ? "" : "text-foreground"}`}>
              {counts[s.value as keyof typeof counts]}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">New Work Order</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-foreground">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Install ridge vent, Tear off old shingles"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detailed instructions..."
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Job (optional)</label>
              <select
                value={form.job_id}
                onChange={(e) => setForm({ ...form, job_id: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">No job linked</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.customer_name} — {j.address}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Assign To</label>
              <select
                value={form.assigned_to}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.invited_name || m.invited_email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving || !form.title.trim()}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating..." : "Create Work Order"}
            </button>
          </div>
        </div>
      )}

      {/* Work Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={filterStatus !== "all" ? `No ${filterStatus.replace("_", " ")} orders` : "No work orders yet"}
          description={filterStatus !== "all" ? "Try a different filter." : "Create work orders to assign tasks to your crew."}
          actionLabel={canEdit && filterStatus === "all" ? "Create First Order" : undefined}
          onAction={canEdit && filterStatus === "all" ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredOrders.map((order) => {
            const priority = PRIORITIES.find((p) => p.value === order.priority) || PRIORITIES[1]
            const status = STATUSES.find((s) => s.value === order.status) || STATUSES[0]
            const StatusIcon = status.icon
            const isOverdue = order.due_date && order.status !== "completed" && new Date(order.due_date) < new Date()

            return (
              <div
                key={order.id}
                className={`rounded-2xl border bg-card shadow-sm overflow-hidden transition-colors ${
                  isOverdue ? "border-red-500/30" : "border-border"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${order.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {order.title}
                        </p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${priority.bg} ${priority.color}`}>
                          {priority.label}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-600">
                            <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                          </span>
                        )}
                      </div>
                      {order.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{order.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {order.jobs && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" /> {order.jobs.customer_name}
                          </span>
                        )}
                        {order.assigned_name && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <User className="h-3 w-3" /> {order.assigned_name}
                          </span>
                        )}
                        {order.due_date && (
                          <span className={`flex items-center gap-1 text-[11px] ${isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                            <Calendar className="h-3 w-3" /> {new Date(order.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/50">{timeAgo(order.created_at)}</span>
                      </div>
                    </div>

                    {/* Status + Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canEdit && (
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`rounded-lg border-none px-2 py-1 text-[11px] font-bold ${status.bg} ${status.color} focus:outline-none cursor-pointer`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      )}
                      {!canEdit && (
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${status.bg} ${status.color}`}>
                          <StatusIcon className="h-3 w-3" /> {status.label}
                        </span>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="rounded-lg p-1.5 text-muted-foreground/40 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
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
