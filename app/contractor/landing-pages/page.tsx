"use client"

import { useState, useEffect } from "react"
import { Plus, Globe, Copy, ExternalLink, Trash2, BarChart3, Eye, Pencil, X, Check, ToggleLeft, ToggleRight } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import { useRole } from "@/lib/role-context"

type LandingPage = {
  id: string
  title: string
  subtitle: string
  cta_text: string
  hero_image_url: string | null
  template: string
  slug: string
  active: boolean
  views: number
  conversions: number
  created_at: string
}

const TEMPLATES = [
  { id: "standard", name: "Standard", description: "Dark theme with centered form" },
  { id: "modern", name: "Modern", description: "Full-width hero with floating form" },
  { id: "minimal", name: "Minimal", description: "Clean white design with trust badges" },
]

export default function LandingPagesPage() {
  const { accountId } = useRole()
  const [pages, setPages] = useState<LandingPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    title: "Get Your Free Roof Estimate",
    subtitle: "Licensed & insured roofing professionals serving your area.",
    cta_text: "Get My Free Quote",
    hero_image_url: "",
    template: "standard",
  })

  const fetchPages = async () => {
    const res = await authFetch("/api/landing-pages")
    if (res.ok) {
      const data = await res.json()
      setPages(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (accountId) fetchPages()
  }, [accountId])

  const handleCreate = async () => {
    setSaving(true)
    const res = await authFetch("/api/landing-pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      await fetchPages()
      setShowCreate(false)
      setForm({ title: "Get Your Free Roof Estimate", subtitle: "Licensed & insured roofing professionals serving your area.", cta_text: "Get My Free Quote", hero_image_url: "", template: "standard" })
    }
    setSaving(false)
  }

  const handleUpdate = async (id: string) => {
    setSaving(true)
    const res = await authFetch("/api/landing-pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...form }),
    })
    if (res.ok) {
      await fetchPages()
      setEditingId(null)
    }
    setSaving(false)
  }

  const handleToggleActive = async (page: LandingPage) => {
    await authFetch("/api/landing-pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: page.id, active: !page.active }),
    })
    await fetchPages()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this landing page? This cannot be undone.")) return
    await authFetch(`/api/landing-pages?id=${id}`, { method: "DELETE" })
    await fetchPages()
  }

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/lp/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const startEdit = (page: LandingPage) => {
    setEditingId(page.id)
    setForm({
      title: page.title,
      subtitle: page.subtitle,
      cta_text: page.cta_text,
      hero_image_url: page.hero_image_url || "",
      template: page.template || "standard",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Landing Pages</h2>
          <p className="text-sm text-muted-foreground">Create lead capture pages to share with potential customers</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null) }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Page
        </button>
      </div>

      {/* Create / Edit Modal */}
      {(showCreate || editingId) && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{editingId ? "Edit Landing Page" : "Create Landing Page"}</h3>
            <button onClick={() => { setShowCreate(false); setEditingId(null) }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Page Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Subtitle</label>
              <input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">CTA Button Text</label>
              <input
                value={form.cta_text}
                onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Template</label>
              <select
                value={form.template}
                onChange={(e) => setForm({ ...form, template: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — {t.description}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Hero Image URL (optional)</label>
              <input
                value={form.hero_image_url}
                onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowCreate(false); setEditingId(null) }}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
              disabled={saving || !form.title.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Create Page"}
            </button>
          </div>
        </div>
      )}

      {/* Pages List */}
      {pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Globe className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <h3 className="text-sm font-bold text-foreground mb-1">No Landing Pages Yet</h3>
          <p className="text-xs text-muted-foreground mb-4">Create a page to start capturing leads from social media, ads, or direct links.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Create Your First Page
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => {
            const convRate = page.views > 0 ? ((page.conversions / page.views) * 100).toFixed(1) : "0.0"
            return (
              <div key={page.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground truncate">{page.title}</h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${page.active ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {page.active ? "Active" : "Inactive"}
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {TEMPLATES.find(t => t.id === page.template)?.name || "Standard"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">/lp/{page.slug}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-foreground">{page.views}</p>
                      <p className="text-[10px] text-muted-foreground">Views</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{page.conversions}</p>
                      <p className="text-[10px] text-muted-foreground">Leads</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">{convRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Conv.</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => copyLink(page.slug)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    {copied === page.slug ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied === page.slug ? "Copied!" : "Copy Link"}
                  </button>
                  <a
                    href={`/lp/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" /> Preview
                  </a>
                  <button
                    onClick={() => startEdit(page)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(page)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    {page.active ? <ToggleRight className="h-3 w-3 text-emerald-400" /> : <ToggleLeft className="h-3 w-3" />}
                    {page.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
