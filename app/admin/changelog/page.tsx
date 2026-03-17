"use client"

import { useEffect, useState } from "react"
import { authFetch } from "@/lib/auth-fetch"
import Link from "next/link"
import {
  ArrowLeft, FileText, Plus, Trash2, Pencil, RefreshCw,
  ToggleLeft, ToggleRight, X, Save, Eye, EyeOff,
} from "lucide-react"

type ChangelogEntry = {
  id: string
  title: string
  description: string
  category: "feature" | "improvement" | "fix" | "announcement"
  published: boolean
  created_at: string
}

const CATEGORIES = [
  { value: "feature", label: "Feature" },
  { value: "improvement", label: "Improvement" },
  { value: "fix", label: "Fix" },
  { value: "announcement", label: "Announcement" },
]

const categoryColors: Record<string, string> = {
  feature: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  improvement: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  fix: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  announcement: "bg-blue-500/15 text-blue-600 border-blue-500/30",
}

export default function AdminChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formCategory, setFormCategory] = useState<ChangelogEntry["category"]>("feature")
  const [formPublished, setFormPublished] = useState(false)

  const fetchData = () => {
    setLoading(true)
    setError("")
    authFetch("/api/admin/changelog")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load changelog")
        return res.json()
      })
      .then((data) => setEntries(data.entries || []))
      .catch(() => setError("Failed to load changelog data"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const resetForm = () => {
    setEditingId(null)
    setFormTitle("")
    setFormDescription("")
    setFormCategory("feature")
    setFormPublished(false)
  }

  const startEdit = (entry: ChangelogEntry) => {
    setEditingId(entry.id)
    setFormTitle(entry.title)
    setFormDescription(entry.description)
    setFormCategory(entry.category)
    setFormPublished(entry.published)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle || !formDescription) return
    setSaving(true)
    setError("")
    try {
      const payload = {
        id: editingId || undefined,
        title: formTitle,
        description: formDescription,
        category: formCategory,
        published: formPublished,
      }
      const res = await authFetch("/api/admin/changelog", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Save failed")
      resetForm()
      fetchData()
    } catch {
      setError("Failed to save changelog entry")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError("")
    try {
      const res = await authFetch(`/api/admin/changelog?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setEntries((prev) => prev.filter((e) => e.id !== id))
      if (editingId === id) resetForm()
    } catch {
      setError("Failed to delete changelog entry")
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
            Changelog
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage product updates and release notes
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
            {editingId ? "Edit Entry" : "New Entry"}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="What changed..."
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ChangelogEntry["category"])}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Published
                </label>
                <button
                  type="button"
                  onClick={() => setFormPublished(!formPublished)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {formPublished ? (
                    <>
                      <ToggleRight className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-600">Yes</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">No</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe the change in detail..."
              rows={4}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
            />
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
              {saving ? "Saving..." : editingId ? "Update Entry" : "Create Entry"}
            </button>
          </div>
        </form>
      </div>

      {/* Entries List */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <FileText className="h-4 w-4 text-amber-600" />
          Entries ({entries.length})
        </h3>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No changelog entries yet
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-border bg-secondary/20 p-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground">{entry.title}</h4>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          categoryColors[entry.category] || "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {entry.category}
                      </span>
                      {entry.published ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          <Eye className="h-2.5 w-2.5" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          <EyeOff className="h-2.5 w-2.5" /> Draft
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {entry.description}
                    </p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(entry)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors"
                      title="Edit entry"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
