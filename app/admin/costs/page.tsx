"use client"

import { useEffect, useState } from "react"
import { authFetch } from "@/lib/auth-fetch"
import Link from "next/link"
import {
  ArrowLeft, DollarSign, TrendingUp, Percent, Users,
  Plus, Pencil, Trash2, X, Calculator,
} from "lucide-react"

type Cost = {
  id: string
  name: string
  monthly_cost: number
  category: string
  notes: string
}

type Summary = {
  mrr: number
  total_monthly_costs: number
  gross_margin: number
  margin_percent: number
  cost_per_contractor: number
  breakeven_contractors: number
}

const EMPTY: Omit<Cost, "id"> = { name: "", monthly_cost: 0, category: "infrastructure", notes: "" }

const CATEGORIES = ["infrastructure", "marketing", "labor", "other"]

const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  marketing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  labor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  other: "bg-muted text-muted-foreground border-border",
}

export default function CostsPage() {
  const [costs, setCosts] = useState<Cost[]>([])
  const [summary, setSummary] = useState<Summary>({ mrr: 0, total_monthly_costs: 0, gross_margin: 0, margin_percent: 0, cost_per_contractor: 0, breakeven_contractors: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Cost, "id">>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchCosts = () => {
    authFetch("/api/admin/costs")
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(data => {
        setCosts(data.costs || [])
        setSummary(data.summary || summary)
      })
      .catch(() => setError("Failed to load costs"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCosts() }, [])

  const handleSave = async () => {
    if (!form.name.trim() || form.monthly_cost <= 0) return
    setSaving(true)
    try {
      const url = editing ? `/api/admin/costs/${editing}` : "/api/admin/costs"
      const method = editing ? "PUT" : "POST"
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setForm(EMPTY)
      setEditing(null)
      setShowForm(false)
      fetchCosts()
    } catch {
      setError("Failed to save cost")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (c: Cost) => {
    setForm({ name: c.name, monthly_cost: c.monthly_cost, category: c.category, notes: c.notes })
    setEditing(c.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this cost?")) return
    try {
      const res = await authFetch(`/api/admin/costs/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      fetchCosts()
    } catch {
      setError("Failed to delete cost")
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" /></div>

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <Link href="/admin/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 p-6 shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>Unit Economics</h2>
            <p className="mt-1 text-sm text-indigo-100">Track costs and margins</p>
          </div>
          <button
            onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(!showForm) }}
            className="flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "Add Cost"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900/30 text-emerald-400"><DollarSign className="h-4 w-4" /></div>
          <p className="mt-2 text-xl font-bold text-foreground">${summary.mrr.toLocaleString()}</p>
          <p className="text-[10px] font-medium text-muted-foreground">MRR</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-900/30 text-red-400"><DollarSign className="h-4 w-4" /></div>
          <p className="mt-2 text-xl font-bold text-foreground">${summary.total_monthly_costs.toLocaleString()}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Total Monthly Costs</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-900/30 text-indigo-400"><TrendingUp className="h-4 w-4" /></div>
          <p className="mt-2 text-xl font-bold text-foreground">${summary.gross_margin.toLocaleString()}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Gross Margin</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-900/30 text-amber-400"><Percent className="h-4 w-4" /></div>
          <p className="mt-2 text-xl font-bold text-foreground">{summary.margin_percent}%</p>
          <p className="text-[10px] font-medium text-muted-foreground">Margin %</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/30 text-blue-400"><Users className="h-4 w-4" /></div>
          <p className="mt-2 text-xl font-bold text-foreground">${summary.cost_per_contractor.toFixed(2)}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Cost Per Contractor</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-900/30 text-purple-400"><Calculator className="h-4 w-4" /></div>
          <p className="mt-2 text-xl font-bold text-foreground">{summary.breakeven_contractors}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Break-even Contractors</p>
        </div>
      </div>

      {/* Add/edit form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {editing ? "Edit Cost" : "Add Cost"}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Name *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. Vercel Hosting"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Monthly Cost ($) *</label>
              <input
                type="number"
                value={form.monthly_cost || ""}
                onChange={e => setForm({ ...form, monthly_cost: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="0.00"
                min={0}
                step={0.01}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || form.monthly_cost <= 0}
              className="rounded-xl bg-indigo-500 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : editing ? "Update Cost" : "Add Cost"}
            </button>
          </div>
        </div>
      )}

      {/* Costs table */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">All Costs</h3>
        {costs.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No costs tracked yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Monthly Cost</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 font-medium">Notes</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {costs.map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{c.name}</td>
                    <td className="py-2.5 pr-4 font-medium text-red-400">${c.monthly_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${CATEGORY_COLORS[c.category] || CATEGORY_COLORS.other}`}>
                        {c.category}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground max-w-[200px] truncate">{c.notes || "—"}</td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(c)} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(c.id)} className="rounded-lg p-1 text-muted-foreground hover:bg-red-500/20 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="border-t-2 border-border">
                  <td className="py-2.5 pr-4 font-bold text-foreground">Total</td>
                  <td className="py-2.5 pr-4 font-bold text-red-400">
                    ${costs.reduce((sum, c) => sum + c.monthly_cost, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
