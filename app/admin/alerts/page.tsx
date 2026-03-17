"use client"

import { useEffect, useState } from "react"
import { authFetch } from "@/lib/auth-fetch"
import Link from "next/link"
import {
  ArrowLeft, Bell, Plus, Trash2, Pencil, RefreshCw,
  ToggleLeft, ToggleRight, AlertTriangle, Clock, X, Save,
} from "lucide-react"

type AlertRule = {
  id: string
  name: string
  trigger_type: string
  condition: { threshold: number }
  notify_method: string
  enabled: boolean
  created_at: string
}

type AlertHistory = {
  id: string
  rule_name: string
  trigger_type: string
  message: string
  fired_at: string
}

const TRIGGER_TYPES = [
  { value: "mrr_drop", label: "MRR Drop" },
  { value: "idle_contractor", label: "Idle Contractor" },
  { value: "trial_inactive", label: "Trial Inactive" },
  { value: "churn", label: "Churn" },
  { value: "custom", label: "Custom" },
]

const NOTIFY_METHODS = [
  { value: "email", label: "Email" },
  { value: "push", label: "Push" },
  { value: "both", label: "Both" },
]

const triggerColors: Record<string, string> = {
  mrr_drop: "bg-red-500/15 text-red-600 border-red-500/30",
  idle_contractor: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  trial_inactive: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  churn: "bg-red-500/15 text-red-600 border-red-500/30",
  custom: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
}

export default function AdminAlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [history, setHistory] = useState<AlertHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formTrigger, setFormTrigger] = useState("mrr_drop")
  const [formThreshold, setFormThreshold] = useState("")
  const [formNotify, setFormNotify] = useState("email")
  const [formEnabled, setFormEnabled] = useState(true)

  const fetchData = () => {
    setLoading(true)
    setError("")
    authFetch("/api/admin/alerts")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load alerts")
        return res.json()
      })
      .then((data) => {
        setRules(data.rules || [])
        setHistory(data.history || [])
      })
      .catch(() => setError("Failed to load alerts data"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const resetForm = () => {
    setEditingId(null)
    setFormName("")
    setFormTrigger("mrr_drop")
    setFormThreshold("")
    setFormNotify("email")
    setFormEnabled(true)
  }

  const startEdit = (rule: AlertRule) => {
    setEditingId(rule.id)
    setFormName(rule.name)
    setFormTrigger(rule.trigger_type)
    setFormThreshold(rule.condition.threshold.toString())
    setFormNotify(rule.notify_method)
    setFormEnabled(rule.enabled)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName || !formThreshold) return
    setSaving(true)
    setError("")
    try {
      const payload = {
        id: editingId || undefined,
        name: formName,
        trigger_type: formTrigger,
        condition: { threshold: parseFloat(formThreshold) },
        notify_method: formNotify,
        enabled: formEnabled,
      }
      const res = await authFetch("/api/admin/alerts", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Save failed")
      resetForm()
      fetchData()
    } catch {
      setError("Failed to save alert rule")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError("")
    try {
      const res = await authFetch(`/api/admin/alerts?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setRules((prev) => prev.filter((r) => r.id !== id))
      if (editingId === id) resetForm()
    } catch {
      setError("Failed to delete alert rule")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Custom Alert Rules
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Configure automated alerts for key business events
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Create / Edit Form */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Plus className="h-4 w-4 text-indigo-400" />
            {editingId ? "Edit Rule" : "New Rule"}
          </h3>
          {editingId && (
            <button
              onClick={resetForm}
              className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          )}
        </div>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Alert name..."
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Trigger Type
              </label>
              <select
                value={formTrigger}
                onChange={(e) => setFormTrigger(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Threshold
              </label>
              <input
                type="number"
                value={formThreshold}
                onChange={(e) => setFormThreshold(e.target.value)}
                placeholder="e.g. 10"
                min="0"
                step="any"
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Notify Method
              </label>
              <select
                value={formNotify}
                onChange={(e) => setFormNotify(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {NOTIFY_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Enabled
              </label>
              <button
                type="button"
                onClick={() => setFormEnabled(!formEnabled)}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm w-full"
              >
                {formEnabled ? (
                  <>
                    <ToggleRight className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-600">Active</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Inactive</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : editingId ? "Update Rule" : "Create Rule"}
            </button>
          </div>
        </form>
      </div>

      {/* Rules List */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Bell className="h-4 w-4 text-amber-600" />
          Alert Rules ({rules.length})
        </h3>
        {rules.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No alert rules configured yet
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${rule.enabled ? "bg-emerald-500/15" : "bg-secondary/50"}`}>
                    <Bell className={`h-4 w-4 ${rule.enabled ? "text-emerald-600" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{rule.name}</p>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          triggerColors[rule.trigger_type] || "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {rule.trigger_type.replace("_", " ")}
                      </span>
                      {!rule.enabled && (
                        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Threshold: {rule.condition.threshold} | Notify: {rule.notify_method}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(rule)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors"
                    title="Edit rule"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert History */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-4 w-4 text-indigo-400" />
          Recent Alert History
        </h3>
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No alerts fired yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Rule</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Message</th>
                  <th className="pb-2 font-medium">Fired At</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/50 hover:bg-secondary/30"
                  >
                    <td className="py-2.5 pr-4 font-medium text-foreground">
                      {item.rule_name}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          triggerColors[item.trigger_type] || "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {item.trigger_type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground max-w-xs truncate">
                      {item.message}
                    </td>
                    <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                      {new Date(item.fired_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
