"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Globe, Copy, ExternalLink, Trash2, Pencil, X, Check, ToggleLeft, ToggleRight, QrCode, Download, ShieldCheck, BarChart3, Palette, ChevronRight } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { useRole } from "@/lib/role-context"
import { useToast } from "@/lib/toast-context"
import { APPROVED_TRUST_BADGES } from "@/lib/validations"

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
  city: string | null
  services: string[] | null
  trust_badges: string[] | null
  testimonials: { quote: string; name: string; city?: string; rating?: number }[] | null
  stats: { value: string; label: string }[] | null
  color_scheme: string | null
  google_ads_id: string | null
  google_ads_label: string | null
  facebook_pixel_id: string | null
  google_analytics_id: string | null
  thank_you_heading: string | null
  thank_you_message: string | null
  redirect_url: string | null
  alt_headline: string | null
  created_at: string
}

const DEFAULT_SERVICES = ["Roof Replacement", "Storm Damage", "Roof Repair", "Free Inspection"]
const DEFAULT_BADGES: string[] = ["Free Estimates", "5-Star Rated", "24hr Response"]

export default function LandingPagesPage() {
  const { accountId } = useRole()
  const toast = useToast()
  const [pages, setPages] = useState<LandingPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [qrSlug, setQrSlug] = useState<string | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  // Licensed & Insured state
  const [licensedInsuredCertified, setLicensedInsuredCertified] = useState(false)
  const [showLicensedBadge, setShowLicensedBadge] = useState(false)
  const [certChecked, setCertChecked] = useState(false)
  const [certSaving, setCertSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    title: "Get Your Free Roof Estimate",
    subtitle: "Licensed & insured roofing professionals serving your area.",
    cta_text: "Get My Free Quote",
    hero_image_url: "",
    city: "",
    services: [...DEFAULT_SERVICES],
    trust_badges: [...DEFAULT_BADGES],
    testimonials: [] as { quote: string; name: string; city?: string; rating?: number }[],
    stats: [] as { value: string; label: string }[],
    color_scheme: "brand" as string,
    google_analytics_id: "",
    facebook_pixel_id: "",
    google_ads_id: "",
    google_ads_label: "",
    thank_you_heading: "Estimate Request Received!",
    thank_you_message: "We'll review your project details and get back to you within 24 hours with a free, no-obligation estimate.",
    redirect_url: "",
    alt_headline: "",
  })

  // Temp inputs for adding items
  const [newService, setNewService] = useState("")
  const [newTestimonialQuote, setNewTestimonialQuote] = useState("")
  const [newTestimonialName, setNewTestimonialName] = useState("")
  const [newTestimonialCity, setNewTestimonialCity] = useState("")
  const [newTestimonialRating, setNewTestimonialRating] = useState(5)
  const [newStatValue, setNewStatValue] = useState("")
  const [newStatLabel, setNewStatLabel] = useState("")
  const [customColor, setCustomColor] = useState("#14b8a6")
  const [showTracking, setShowTracking] = useState(false)

  const fetchPages = async () => {
    const res = await authFetch("/api/landing-pages")
    if (res.ok) {
      const data = await res.json()
      setPages(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  // Load profile certification status
  const loadCertification = async () => {
    try {
      const res = await authFetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        if (data.licensed_insured_certified) {
          setLicensedInsuredCertified(true)
          setShowLicensedBadge(true)
          setCertChecked(true)
        }
      }
    } catch {
      // Silently fail — non-critical
    }
  }

  useEffect(() => {
    if (accountId) {
      fetchPages()
      loadCertification()
    }
  }, [accountId])

  const resetForm = () => {
    setForm({
      title: "Get Your Free Roof Estimate",
      subtitle: "Licensed & insured roofing professionals serving your area.",
      cta_text: "Get My Free Quote",
      hero_image_url: "",
      city: "",
      services: [...DEFAULT_SERVICES],
      trust_badges: [...DEFAULT_BADGES],
      testimonials: [],
      stats: [],
      color_scheme: "brand",
      google_analytics_id: "",
      facebook_pixel_id: "",
      google_ads_id: "",
      google_ads_label: "",
      thank_you_heading: "Estimate Request Received!",
      thank_you_message: "We'll review your project details and get back to you within 24 hours with a free, no-obligation estimate.",
      redirect_url: "",
      alt_headline: "",
    })
    setCustomColor("#14b8a6")
  }

  const handleCreate = async () => {
    setSaving(true)
    setFormError("")
    const payload = {
      ...form,
      template: "modern",
      color_scheme: form.color_scheme === "custom" ? customColor : "brand",
    }
    const res = await authFetch("/api/landing-pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      await fetchPages()
      setShowCreate(false)
      resetForm()
      toast.success("Landing page created!")
    } else {
      const data = await res.json().catch(() => ({}))
      setFormError(data.error || "Failed to create landing page")
    }
    setSaving(false)
  }

  const handleUpdate = async (id: string) => {
    setSaving(true)
    const payload = {
      id,
      ...form,
      template: "modern",
      color_scheme: form.color_scheme === "custom" ? customColor : "brand",
    }
    const res = await authFetch("/api/landing-pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      await fetchPages()
      setEditingId(null)
      toast.success("Landing page updated!")
    } else {
      const data = await res.json().catch(() => ({}))
      setFormError(data.error || "Failed to update landing page")
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
    const isCustomColor = page.color_scheme && page.color_scheme !== "brand"
    setForm({
      title: page.title,
      subtitle: page.subtitle,
      cta_text: page.cta_text,
      hero_image_url: page.hero_image_url || "",
      city: (page as LandingPage).city || "",
      services: page.services?.length ? [...page.services] : [...DEFAULT_SERVICES],
      trust_badges: page.trust_badges?.length ? [...page.trust_badges] : [...DEFAULT_BADGES],
      testimonials: page.testimonials?.length ? [...page.testimonials] : [],
      stats: page.stats?.length ? [...page.stats] : [],
      color_scheme: isCustomColor ? "custom" : "brand",
      google_analytics_id: page.google_analytics_id || "",
      facebook_pixel_id: page.facebook_pixel_id || "",
      google_ads_id: page.google_ads_id || "",
      google_ads_label: page.google_ads_label || "",
      thank_you_heading: page.thank_you_heading || "Estimate Request Received!",
      thank_you_message: page.thank_you_message || "We'll review your project details and get back to you within 24 hours with a free, no-obligation estimate.",
      redirect_url: page.redirect_url || "",
      alt_headline: page.alt_headline || "",
    })
    if (isCustomColor && page.color_scheme) {
      setCustomColor(page.color_scheme)
    } else {
      setCustomColor("#14b8a6")
    }
  }

  const handleCertification = async () => {
    setCertSaving(true)
    try {
      const res = await authFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licensed_insured_certified: true }),
      })
      if (res.ok) {
        setLicensedInsuredCertified(true)
        toast.success("Licensed & Insured certification saved!")
      } else {
        toast.error("Failed to save certification")
        setCertChecked(false)
      }
    } catch {
      toast.error("Failed to save certification")
      setCertChecked(false)
    }
    setCertSaving(false)
  }

  const toggleTrustBadge = (badge: string) => {
    const current = form.trust_badges
    if (current.includes(badge)) {
      setForm({ ...form, trust_badges: current.filter((b) => b !== badge) })
    } else if (current.length < 5) {
      setForm({ ...form, trust_badges: [...current, badge] })
    }
  }

  const showQrCode = async (slug: string) => {
    setQrSlug(slug)
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
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">City (appears in page heading)</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. Dallas, TX"
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Services (max 6)</label>
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

          {/* Trust Badges — Checkbox Grid */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Trust Badges (max 5)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {APPROVED_TRUST_BADGES.map((badge) => {
                const isSelected = form.trust_badges.includes(badge)
                const isDisabled = !isSelected && form.trust_badges.length >= 5
                return (
                  <label
                    key={badge}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground"
                        : isDisabled
                          ? "border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                          : "border-border bg-background text-foreground hover:bg-secondary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleTrustBadge(badge)}
                      className="rounded border-border text-primary focus:ring-primary/30 h-3.5 w-3.5"
                    />
                    {badge}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Licensed & Insured Certification */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-foreground">Show Licensed &amp; Insured badge</span>
              </div>
              <button
                onClick={() => {
                  if (showLicensedBadge) {
                    setShowLicensedBadge(false)
                  } else {
                    setShowLicensedBadge(true)
                  }
                }}
                className="text-foreground"
              >
                {showLicensedBadge
                  ? <ToggleRight className="h-6 w-6 text-emerald-500" />
                  : <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                }
              </button>
            </div>

            {showLicensedBadge && !licensedInsuredCertified && (
              <div className="space-y-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={certChecked}
                    onChange={(e) => setCertChecked(e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary/30 h-3.5 w-3.5"
                  />
                  <span className="text-[11px] leading-relaxed text-muted-foreground">
                    I certify that my business is currently licensed and carries active general liability insurance in my state of operation. I understand that misrepresenting my licensing or insurance status is a violation of XRoof&apos;s Terms of Service.
                  </span>
                </label>
                <button
                  onClick={handleCertification}
                  disabled={!certChecked || certSaving}
                  className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {certSaving ? "Saving..." : "Confirm Certification"}
                </button>
              </div>
            )}

            {showLicensedBadge && licensedInsuredCertified && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                <Check className="h-3.5 w-3.5" />
                Certified — badge will appear on your landing pages
              </p>
            )}
          </div>

          {/* Company Stats */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground">Company Stats (max 4)</label>
            </div>
            {form.stats.length > 0 && (
              <div className="space-y-2 mb-2">
                {form.stats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-secondary p-2.5">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{stat.value}</span>
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <button onClick={() => setForm({ ...form, stats: form.stats.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {form.stats.length < 4 && (
              <div className="flex gap-2">
                <input
                  value={newStatValue}
                  onChange={(e) => setNewStatValue(e.target.value)}
                  placeholder="Value (e.g. 500+)"
                  className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <input
                  value={newStatLabel}
                  onChange={(e) => setNewStatLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newStatValue.trim() && newStatLabel.trim()) {
                      setForm({ ...form, stats: [...form.stats, { value: newStatValue.trim(), label: newStatLabel.trim() }] })
                      setNewStatValue("")
                      setNewStatLabel("")
                    }
                  }}
                  placeholder="Label (e.g. Roofs Completed)"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <button
                  onClick={() => {
                    if (newStatValue.trim() && newStatLabel.trim()) {
                      setForm({ ...form, stats: [...form.stats, { value: newStatValue.trim(), label: newStatLabel.trim() }] })
                      setNewStatValue("")
                      setNewStatLabel("")
                    }
                  }}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Testimonials */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Testimonials (max 5)</label>
            {form.testimonials.length > 0 && (
              <div className="space-y-2 mb-2">
                {form.testimonials.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-secondary p-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-0.5 mb-0.5">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <span key={s} className={`text-[10px] ${s < (t.rating || 5) ? "text-amber-400" : "text-muted-foreground/30"}`}>&#9733;</span>
                        ))}
                      </div>
                      <p className="text-xs text-foreground">&ldquo;{t.quote}&rdquo;</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        &mdash; {t.name}{t.city ? `, ${t.city}` : ""}
                      </p>
                    </div>
                    <button onClick={() => setForm({ ...form, testimonials: form.testimonials.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {form.testimonials.length < 5 && (
              <div className="space-y-2">
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
                    className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <input
                    value={newTestimonialCity}
                    onChange={(e) => setNewTestimonialCity(e.target.value)}
                    placeholder="City"
                    className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">Rating:</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewTestimonialRating(s + 1)}
                        className={`text-base transition-colors ${s < newTestimonialRating ? "text-amber-400" : "text-muted-foreground/30"} hover:text-amber-400`}
                      >
                        &#9733;
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (newTestimonialQuote.trim()) {
                        const testimonial: { quote: string; name: string; city?: string; rating?: number } = {
                          quote: newTestimonialQuote.trim(),
                          name: newTestimonialName.trim() || "Homeowner",
                          rating: newTestimonialRating,
                        }
                        if (newTestimonialCity.trim()) {
                          testimonial.city = newTestimonialCity.trim()
                        }
                        setForm({ ...form, testimonials: [...form.testimonials, testimonial] })
                        setNewTestimonialQuote("")
                        setNewTestimonialName("")
                        setNewTestimonialCity("")
                        setNewTestimonialRating(5)
                      }
                    }}
                    className="ml-auto rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Color Scheme */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground">Color Scheme</label>
            </div>
            <div className="flex gap-3">
              <label
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                  form.color_scheme === "brand"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-foreground hover:bg-secondary"
                }`}
              >
                <input
                  type="radio"
                  name="color_scheme"
                  checked={form.color_scheme === "brand"}
                  onChange={() => setForm({ ...form, color_scheme: "brand" })}
                  className="h-3.5 w-3.5 text-primary focus:ring-primary/30"
                />
                Use brand color
              </label>
              <label
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                  form.color_scheme === "custom"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-foreground hover:bg-secondary"
                }`}
              >
                <input
                  type="radio"
                  name="color_scheme"
                  checked={form.color_scheme === "custom"}
                  onChange={() => setForm({ ...form, color_scheme: "custom" })}
                  className="h-3.5 w-3.5 text-primary focus:ring-primary/30"
                />
                Custom color
              </label>
            </div>
            {form.color_scheme === "custom" && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                />
                <input
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#14b8a6"
                  className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            )}
          </div>

          {/* Tracking & Analytics (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowTracking(!showTracking)}
              className="flex items-center gap-2 mb-2 w-full text-left"
            >
              <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showTracking ? "rotate-90" : ""}`} />
              <span className="text-xs font-medium text-muted-foreground">Tracking &amp; Analytics</span>
            </button>
            {showTracking && (
              <div className="grid gap-3 sm:grid-cols-2 pl-5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Google Analytics ID (optional)</label>
                  <input
                    value={form.google_analytics_id}
                    onChange={(e) => setForm({ ...form, google_analytics_id: e.target.value })}
                    placeholder="e.g., G-XXXXXXXXXX"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Enter your GA4 Measurement ID to track page visitors.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Facebook Pixel ID (optional)</label>
                  <input
                    value={form.facebook_pixel_id}
                    onChange={(e) => setForm({ ...form, facebook_pixel_id: e.target.value })}
                    placeholder="e.g., 123456789012345"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Enter your Facebook Pixel ID. Find it in Facebook Ads Manager &rarr; Events Manager.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Google Ads Conversion ID (optional)</label>
                  <input
                    value={form.google_ads_id}
                    onChange={(e) => setForm({ ...form, google_ads_id: e.target.value })}
                    placeholder="e.g., AW-123456789"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Enter your Google Ads Conversion ID for conversion tracking.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Google Ads Conversion Label (optional)</label>
                  <input
                    value={form.google_ads_label}
                    onChange={(e) => setForm({ ...form, google_ads_label: e.target.value })}
                    placeholder="e.g., AbCdEf"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Enter the conversion label from your Google Ads tag.</p>
                </div>
              </div>
            )}
          </div>

          {/* After Form Submission */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">After Form Submission</label>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Thank You Heading</label>
                <input
                  value={form.thank_you_heading}
                  onChange={(e) => setForm({ ...form, thank_you_heading: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Thank You Message</label>
                <textarea
                  value={form.thank_you_message}
                  onChange={(e) => setForm({ ...form, thank_you_message: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Redirect URL (optional)</label>
                <input
                  value={form.redirect_url}
                  onChange={(e) => setForm({ ...form, redirect_url: e.target.value })}
                  placeholder="https://yourwebsite.com/thank-you"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">If set, visitors redirect here after submission. Useful for Google Ads conversion tracking.</p>
              </div>
            </div>
          </div>

          {/* A/B Testing */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">A/B Testing</label>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">A/B Test Headline (optional)</label>
              <input
                value={form.alt_headline}
                onChange={(e) => setForm({ ...form, alt_headline: e.target.value })}
                placeholder="Enter an alternative headline to test"
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">If set, 50% of visitors will see this headline instead. Check analytics to see which converts better.</p>
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
