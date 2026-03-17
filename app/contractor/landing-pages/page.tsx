"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Globe, Copy, ExternalLink, Trash2, Eye, Pencil, X, Check, ToggleLeft, ToggleRight, QrCode, Download, Code } from "lucide-react"
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
  services: string[] | null
  trust_badges: string[] | null
  testimonials: { quote: string; name: string }[] | null
  created_at: string
}

const TEMPLATES = [
  { id: "standard", name: "Standard", description: "Dark theme with centered form" },
  { id: "modern", name: "Modern", description: "Full-width hero with floating form" },
  { id: "minimal", name: "Minimal", description: "Clean white design with trust badges" },
]

const DEFAULT_SERVICES = ["Roof Replacement", "Storm Damage", "Roof Repair", "Free Inspection"]
const DEFAULT_BADGES = ["Licensed & Insured", "5-Star Reviews", "Free Estimates"]

export default function LandingPagesPage() {
  const { accountId } = useRole()
  const [pages, setPages] = useState<LandingPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [qrSlug, setQrSlug] = useState<string | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  // Form state
  const [form, setForm] = useState({
    title: "Get Your Free Roof Estimate",
    subtitle: "Licensed & insured roofing professionals serving your area.",
    cta_text: "Get My Free Quote",
    hero_image_url: "",
    template: "standard",
    services: [...DEFAULT_SERVICES],
    trust_badges: [...DEFAULT_BADGES],
    testimonials: [] as { quote: string; name: string }[],
  })

  // Temp inputs for adding items
  const [newService, setNewService] = useState("")
  const [newBadge, setNewBadge] = useState("")
  const [newTestimonialQuote, setNewTestimonialQuote] = useState("")
  const [newTestimonialName, setNewTestimonialName] = useState("")

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

  const resetForm = () => {
    setForm({
      title: "Get Your Free Roof Estimate",
      subtitle: "Licensed & insured roofing professionals serving your area.",
      cta_text: "Get My Free Quote",
      hero_image_url: "",
      template: "standard",
      services: [...DEFAULT_SERVICES],
      trust_badges: [...DEFAULT_BADGES],
      testimonials: [],
    })
  }

  const handleCreate = async () => {
    setSaving(true)
    setFormError("")
    const res = await authFetch("/api/landing-pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      await fetchPages()
      setShowCreate(false)
      resetForm()
    } else {
      const data = await res.json().catch(() => ({}))
      setFormError(data.error || "Failed to create landing page")
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
      services: page.services?.length ? [...page.services] : [...DEFAULT_SERVICES],
      trust_badges: page.trust_badges?.length ? [...page.trust_badges] : [...DEFAULT_BADGES],
      testimonials: page.testimonials?.length ? [...page.testimonials] : [],
    })
  }

  const showQrCode = async (slug: string) => {
    setQrSlug(slug)
    // Dynamically import qrcode to generate on client
    try {
      const QRCode = (await import("qrcode")).default
      const url = `${window.location.origin}/lp/${slug}`
      setTimeout(() => {
        if (qrCanvasRef.current) {
          QRCode.toCanvas(qrCanvasRef.current, url, {
            width: 280,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          })
        }
      }, 100)
    } catch {
      // fallback — qrcode not installed
    }
  }

  const downloadQr = () => {
    if (!qrCanvasRef.current) return
    const link = document.createElement("a")
    link.download = `qr-${qrSlug}.png`
    link.href = qrCanvasRef.current.toDataURL("image/png")
    link.click()
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
          onClick={() => { setShowCreate(true); setEditingId(null); resetForm() }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Page
        </button>
      </div>

      {/* Create / Edit Form */}
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

          {/* Services */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Services (shown on Modern template, max 6)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.services.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                  {s}
                  <button onClick={() => setForm({ ...form, services: form.services.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {form.services.length < 6 && (
              <div className="flex gap-2">
                <input
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newService.trim()) { setForm({ ...form, services: [...form.services, newService.trim()] }); setNewService("") } }}
                  placeholder="Add service..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <button
                  onClick={() => { if (newService.trim()) { setForm({ ...form, services: [...form.services, newService.trim()] }); setNewService("") } }}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Trust Badges */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Trust Badges (max 5)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.trust_badges.map((b, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                  {b}
                  <button onClick={() => setForm({ ...form, trust_badges: form.trust_badges.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {form.trust_badges.length < 5 && (
              <div className="flex gap-2">
                <input
                  value={newBadge}
                  onChange={(e) => setNewBadge(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newBadge.trim()) { setForm({ ...form, trust_badges: [...form.trust_badges, newBadge.trim()] }); setNewBadge("") } }}
                  placeholder="Add badge..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <button
                  onClick={() => { if (newBadge.trim()) { setForm({ ...form, trust_badges: [...form.trust_badges, newBadge.trim()] }); setNewBadge("") } }}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Testimonials */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Testimonials (shown on Minimal template, max 5)</label>
            {form.testimonials.length > 0 && (
              <div className="space-y-2 mb-2">
                {form.testimonials.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-secondary p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">&ldquo;{t.quote}&rdquo;</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">— {t.name}</p>
                    </div>
                    <button onClick={() => setForm({ ...form, testimonials: form.testimonials.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {form.testimonials.length < 5 && (
              <div className="flex gap-2">
                <input
                  value={newTestimonialQuote}
                  onChange={(e) => setNewTestimonialQuote(e.target.value)}
                  placeholder="Quote..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <input
                  value={newTestimonialName}
                  onChange={(e) => setNewTestimonialName(e.target.value)}
                  placeholder="Name"
                  className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <button
                  onClick={() => {
                    if (newTestimonialQuote.trim()) {
                      setForm({ ...form, testimonials: [...form.testimonials, { quote: newTestimonialQuote.trim(), name: newTestimonialName.trim() || "Homeowner" }] })
                      setNewTestimonialQuote("")
                      setNewTestimonialName("")
                    }
                  }}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80"
                >
                  Add
                </button>
              </div>
            )}
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
          {formError && (
            <p className="mt-2 text-xs text-red-600">{formError}</p>
          )}
        </div>
      )}

      {/* QR Code Modal */}
      {qrSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setQrSlug(null)}>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">QR Code</h3>
              <button onClick={() => setQrSlug(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex justify-center mb-3">
              <canvas ref={qrCanvasRef} />
            </div>
            <p className="text-[10px] text-center text-muted-foreground mb-4 break-all">{window.location.origin}/lp/{qrSlug}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={downloadQr}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-3 w-3" /> Download PNG
              </button>
              <button
                onClick={() => copyLink(qrSlug!)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary"
              >
                <Copy className="h-3 w-3" /> Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embed on Your Website */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Code className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground mb-1">Embed on Your Website</h3>
            <p className="text-xs text-muted-foreground mb-3">Add a lead capture form to your existing website. Paste this snippet anywhere on your site — leads flow directly into your XRoof dashboard.</p>
            <div className="relative">
              <pre className="rounded-lg bg-muted/50 border border-border p-3 pr-20 text-xs text-foreground overflow-x-auto font-mono whitespace-pre-wrap break-all">
{`<script src="${typeof window !== "undefined" ? window.location.origin : "https://xroof.io"}/embed.js" data-contractor="${accountId}"></script>`}
              </pre>
              <button
                onClick={() => {
                  const code = `<script src="${window.location.origin}/embed.js" data-contractor="${accountId}"></script>`
                  navigator.clipboard.writeText(code)
                  setCopied("embed")
                  setTimeout(() => setCopied(null), 2000)
                }}
                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-background border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied === "embed" ? <><Check className="h-3 w-3 text-green-500" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
              </button>
            </div>
          </div>
        </div>
      </div>

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
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${page.active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
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
                    {copied === page.slug ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copied === page.slug ? "Copied!" : "Copy Link"}
                  </button>
                  <button
                    onClick={() => showQrCode(page.slug)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <QrCode className="h-3 w-3" /> QR Code
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
                    {page.active ? <ToggleRight className="h-3 w-3 text-emerald-600" /> : <ToggleLeft className="h-3 w-3" />}
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
