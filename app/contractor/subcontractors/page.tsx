"use client"

import { useEffect, useState } from "react"
import { useRole } from "@/lib/role-context"
import { useToast } from "@/lib/toast-context"
import { authFetch } from "@/lib/auth-fetch"
import { EmptyState } from "@/components/empty-state"
import {
  HardHat, Plus, Trash2, Edit3, Star, Phone, Mail,
  Shield, AlertTriangle, Loader2, X,
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

  useEffect(() => {
    if (!accountId) return
    loadSubs()
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
      setDeleteConfirm(null)
    } catch {
      toast.error("Failed to delete subcontractor")
    } finally {
      setDeleting(false)
    }
  }

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
            Manage your subcontractor network
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
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground md:table-cell">Specialty</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground lg:table-cell">Phone</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground lg:table-cell">Email</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground md:table-cell">Rate</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground sm:table-cell">Insurance</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Rating</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => {
                const ins = insuranceStatus(sub.insurance_expiry)
                return (
                  <tr
                    key={sub.id}
                    className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{sub.name}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {sub.specialty || "—"}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {sub.phone ? (
                        <a href={`tel:${sub.phone}`} className="inline-flex items-center gap-1 text-blue-400 hover:underline">
                          <Phone className="h-3.5 w-3.5" />
                          {sub.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {sub.email ? (
                        <a href={`mailto:${sub.email}`} className="inline-flex items-center gap-1 text-blue-400 hover:underline">
                          <Mail className="h-3.5 w-3.5" />
                          {sub.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
                          Expiring Soon
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                          <Shield className="h-3 w-3" />
                          {new Date(sub.insurance_expiry!).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StarRating value={sub.rating || 0} readonly />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
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
