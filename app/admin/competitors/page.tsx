"use client"

import { useEffect, useState } from "react"
import { authFetch } from "@/lib/auth-fetch"
import Link from "next/link"
import {
  ArrowLeft, Plus, Pencil, Trash2, Globe, X, Target,
} from "lucide-react"

type Competitor = {
  id: string
  name: string
  pricing: string
  website: string
  strengths: string
  weaknesses: string
  notes: string
}

const EMPTY: Omit<Competitor, "id"> = { name: "", pricing: "", website: "", strengths: "", weaknesses: "", notes: "" }

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Competitor, "id">>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchCompetitors = () => {
    authFetch("/api/admin/competitors")
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(data => setCompetitors(data.competitors || data || []))
      .catch(() => setError("Failed to load competitors"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCompetitors() }, [])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const url = editing ? `/api/admin/competitors/${editing}` : "/api/admin/competitors"
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
      fetchCompetitors()
    } catch {
      setError("Failed to save competitor")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (c: Competitor) => {
    setForm({ name: c.name, pricing: c.pricing, website: c.website, strengths: c.strengths, weaknesses: c.weaknesses, notes: c.notes })
    setEditing(c.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this competitor?")) return
    try {
      const res = await authFetch(`/api/admin/competitors/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      fetchCompetitors()
    } catch {
      setError("Failed to delete competitor")
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
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>Competitor Intelligence</h2>
            <p className="mt-1 text-sm text-indigo-100">Track and analyze competitor landscape</p>
          </div>
          <button
            onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(!showForm) }}
            className="flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "Add Competitor"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {editing ? "Edit Competitor" : "Add Competitor"}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Name *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Competitor name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Pricing</label>
              <input
                value={form.pricing}
                onChange={e => setForm({ ...form, pricing: e.target.value })}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. $49/mo, $99/mo"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">Website</label>
              <input
                value={form.website}
                onChange={e => setForm({ ...form, website: e.target.value })}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Strengths</label>
              <textarea
                value={form.strengths}
                onChange={e => setForm({ ...form, strengths: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="What they do well..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Weaknesses</label>
              <textarea
                value={form.weaknesses}
                onChange={e => setForm({ ...form, weaknesses: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="Where they fall short..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="rounded-xl bg-indigo-500 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : editing ? "Update Competitor" : "Add Competitor"}
            </button>
          </div>
        </div>
      )}

      {/* Card grid */}
      {competitors.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Target className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">No competitors tracked yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {competitors.map(c => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{c.name}</h3>
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 mt-0.5">
                      <Globe className="h-3 w-3" /> {c.website}
                    </a>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(c)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {c.pricing && (
                <div className="mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">Pricing</p>
                  <p className="text-xs font-medium text-emerald-400">{c.pricing}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {c.strengths && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-emerald-400 mb-1">Strengths</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{c.strengths}</p>
                  </div>
                )}
                {c.weaknesses && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-red-400 mb-1">Weaknesses</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{c.weaknesses}</p>
                  </div>
                )}
              </div>

              {c.notes && (
                <div className="mt-3 rounded-xl bg-secondary/30 p-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Notes</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{c.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
