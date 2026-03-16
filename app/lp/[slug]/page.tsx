"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { MapPin, Phone, Mail, Shield, Star, ArrowRight, CheckCircle, Loader2 } from "lucide-react"
import { GoogleReviewsBadge } from "@/components/google-reviews-badge"

type LandingPage = {
  id: string
  contractor_id: string
  title: string
  subtitle: string
  cta_text: string
  hero_image_url: string | null
  template: string
  services: string[] | null
  trust_badges: string[] | null
  testimonials: { quote: string; name: string }[] | null
  utm_source: string | null
  utm_campaign: string | null
}

type Branding = {
  company_name: string
  logo_url: string
  widget_color: string
  phone: string
  email: string
  service_zips: string[]
  widget_price_per_sqft: number | null
  google_review_url: string
  google_reviews_cache: { rating: number; reviewCount: number } | null
}

export default function LandingPageView() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string

  const [page, setPage] = useState<LandingPage | null>(null)
  const [branding, setBranding] = useState<Branding | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Form state
  const [step, setStep] = useState<"form" | "submitted">("form")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Capture UTM params from URL or landing page defaults
  const utmSource = searchParams.get("utm_source") || page?.utm_source || "landing_page"
  const utmMedium = searchParams.get("utm_medium") || "web"
  const utmCampaign = searchParams.get("utm_campaign") || page?.utm_campaign || ""

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/lp?slug=${slug}`)
        if (!res.ok) { setError(true); setLoading(false); return }
        const data = await res.json()
        setPage(data.page)
        setBranding(data.branding)

        // Increment view count (fire and forget)
        fetch(`/api/lp/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page_id: data.page.id }),
        }).catch(() => {})
      } catch { setError(true) }
      setLoading(false)
    }
    load()
  }, [slug])

  const handleSubmit = async () => {
    if (!name || !address || submitting || !page) return
    // Basic phone validation (at least 10 digits)
    const digitsOnly = phone.replace(/\D/g, "")
    if (digitsOnly.length < 10) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/lp/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: page.id,
          contractor_id: page.contractor_id,
          name,
          phone,
          email,
          address,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
        }),
      })
      if (res.ok) setStep("submitted")
    } catch {}
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !page || !branding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
          <p className="text-gray-400">This landing page doesn&apos;t exist or has been deactivated.</p>
        </div>
      </div>
    )
  }

  const brandColor = branding.widget_color || "#3b82f6"
  const companyName = branding.company_name || "Roofing Company"
  const template = page.template || "standard"
  const services = page.services?.length ? page.services : ["Roof Replacement", "Storm Damage", "Roof Repair", "Free Inspection"]
  const trustBadges = page.trust_badges?.length ? page.trust_badges : ["Licensed & Insured", "5-Star Reviews", "Free Estimates"]
  const testimonials = page.testimonials?.length ? page.testimonials : [
    { quote: "Fast, professional, and fair pricing. Highly recommend!", name: "Homeowner" },
    { quote: "They showed up on time and did excellent work on our roof.", name: "Homeowner" },
    { quote: "Best roofing experience we've ever had. 5 stars!", name: "Homeowner" },
  ]

  const renderLeadForm = (dark = true) => (
    step === "form" ? (
      <div className={`rounded-2xl border p-6 shadow-xl ${dark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"}`}>
        <h2 className={`text-xl font-bold text-center mb-1 ${dark ? "text-white" : "text-gray-900"}`}>{page.cta_text}</h2>
        <p className={`text-xs text-center mb-5 ${dark ? "text-gray-400" : "text-gray-500"}`}>No commitment. No spam. Just a free quote.</p>
        <div className="space-y-3">
          {[
            { val: name, set: setName, ph: "Your Name *", type: "text" },
            { val: phone, set: setPhone, ph: "Phone Number *", type: "tel" },
            { val: email, set: setEmail, ph: "Email (optional)", type: "email" },
            { val: address, set: setAddress, ph: "Property Address *", type: "text" },
          ].map(({ val, set, ph, type }) => (
            <input
              key={ph}
              value={val}
              onChange={(e) => set(e.target.value)}
              type={type}
              placeholder={ph}
              className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                dark ? "border-gray-700 bg-gray-800 text-white placeholder:text-gray-500" : "border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-400"
              }`}
            />
          ))}
          <button
            onClick={handleSubmit}
            disabled={!name || !phone || !address || submitting}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: brandColor }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {submitting ? "Submitting..." : page.cta_text}
          </button>
        </div>
        <p className={`mt-3 text-[10px] text-center ${dark ? "text-gray-500" : "text-gray-400"}`}>
          By submitting, you agree to be contacted about your roofing project.
        </p>
      </div>
    ) : (
      <div className={`rounded-2xl border p-8 text-center ${dark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"}`}>
        <CheckCircle className="mx-auto mb-4 h-12 w-12" style={{ color: brandColor }} />
        <h2 className={`text-xl font-bold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>Thank You!</h2>
        <p className={`text-sm mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          We&apos;ve received your request. {companyName} will contact you shortly with your free estimate.
        </p>
        {branding.phone && (
          <a href={`tel:${branding.phone}`} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: brandColor }}>
            <Phone className="h-4 w-4" /> Call Us Now: {branding.phone}
          </a>
        )}
      </div>
    )
  )

  const renderTrustBadges = (dark = true) => (
    <div className={`flex flex-wrap items-center justify-center gap-4 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
      {branding.google_reviews_cache?.rating && (
        <GoogleReviewsBadge rating={branding.google_reviews_cache.rating} reviewCount={branding.google_reviews_cache.reviewCount} reviewUrl={branding.google_review_url} />
      )}
      {trustBadges.map((badge, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i === 0 ? <Shield className="h-4 w-4" style={{ color: brandColor }} /> : i === 1 ? <Star className="h-4 w-4" style={{ color: brandColor }} /> : <CheckCircle className="h-4 w-4" style={{ color: brandColor }} />}
          {badge}
        </span>
      ))}
    </div>
  )

  const renderFooter = (dark = true) => (
    <footer className={`border-t py-6 text-center ${dark ? "border-gray-800" : "border-gray-200"}`}>
      <p className={`text-sm font-semibold ${dark ? "text-gray-300" : "text-gray-700"}`}>{companyName}</p>
      <div className={`mt-2 flex items-center justify-center gap-4 text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
        {branding.phone && <a href={`tel:${branding.phone}`} className="flex items-center gap-1 hover:opacity-70"><Phone className="h-3 w-3" /> {branding.phone}</a>}
        {branding.email && <a href={`mailto:${branding.email}`} className="flex items-center gap-1 hover:opacity-70"><Mail className="h-3 w-3" /> {branding.email}</a>}
      </div>
      <p className={`mt-3 text-[10px] ${dark ? "text-gray-600" : "text-gray-300"}`}>Powered by XRoof</p>
    </footer>
  )

  // ─── Template: Modern ───
  if (template === "modern") {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="relative min-h-[70vh] flex items-center overflow-hidden">
          {page.hero_image_url && <img src={page.hero_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
          <div className="relative mx-auto grid max-w-5xl gap-8 px-6 py-20 lg:grid-cols-2 lg:items-center">
            <div>
              {branding.logo_url && <img src={branding.logo_url} alt={companyName} className="mb-6 h-14 w-14 rounded-xl object-cover" />}
              <h1 className="text-4xl font-bold sm:text-5xl leading-tight" style={{ fontFamily: "var(--font-heading)" }}>{page.title}</h1>
              <p className="mt-4 text-lg text-gray-300">{page.subtitle}</p>
              <div className="mt-6">{renderTrustBadges()}</div>
              {/* Services grid */}
              <div className="mt-8 grid grid-cols-2 gap-3">
                {services.map((s) => (
                  <div key={s} className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/50 px-3 py-2.5 text-sm">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: brandColor }} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div>{renderLeadForm()}</div>
          </div>
        </div>
        {renderFooter()}
      </div>
    )
  }

  // ─── Template: Minimal ───
  if (template === "minimal") {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24 text-center">
          {branding.logo_url && <img src={branding.logo_url} alt={companyName} className="mx-auto mb-6 h-16 w-16 rounded-2xl object-cover" />}
          <h1 className="text-3xl font-bold sm:text-4xl text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>{page.title}</h1>
          <p className="mt-4 text-lg text-gray-500">{page.subtitle}</p>
          <div className="mt-6">{renderTrustBadges(false)}</div>
        </div>
        <div className="mx-auto max-w-md px-6 pb-16">{renderLeadForm(false)}</div>
        {/* Testimonial placeholder */}
        <div className="border-t border-gray-200 bg-gray-50 py-12">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Trusted by Homeowners</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {testimonials.map((t, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                  <div className="flex justify-center gap-0.5 mb-2">{[1,2,3,4,5].map(s => <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
                  <p>&ldquo;{t.quote}&rdquo;</p>
                  {t.name && <p className="mt-2 text-xs font-medium text-gray-400">— {t.name}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
        {renderFooter(false)}
      </div>
    )
  }

  // ─── Template: Standard (default) ───
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="relative overflow-hidden">
        {page.hero_image_url && <img src={page.hero_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
        <div className="relative px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            {branding.logo_url && <img src={branding.logo_url} alt={companyName} className="mx-auto mb-6 h-16 w-16 rounded-2xl object-cover" />}
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>{page.title}</h1>
            <p className="mt-4 text-lg text-gray-300">{page.subtitle}</p>
            <div className="mt-6">{renderTrustBadges()}</div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-md px-6 py-10 -mt-6">{renderLeadForm()}</div>
      {renderFooter()}
    </div>
  )
}
