"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { MapPin, Phone, Mail, Shield, Star, ArrowRight, CheckCircle, Loader2 } from "lucide-react"

type LandingPage = {
  id: string
  contractor_id: string
  title: string
  subtitle: string
  cta_text: string
  hero_image_url: string | null
  template: string
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {page.hero_image_url && (
          <img src={page.hero_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        )}
        <div className="relative px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            {branding.logo_url && (
              <img src={branding.logo_url} alt={companyName} className="mx-auto mb-6 h-16 w-16 rounded-2xl object-cover" />
            )}
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
              {page.title}
            </h1>
            <p className="mt-4 text-lg text-gray-300">{page.subtitle}</p>

            {/* Trust indicators */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" style={{ color: brandColor }} /> Licensed &amp; Insured</span>
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4" style={{ color: brandColor }} /> 5-Star Reviews</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4" style={{ color: brandColor }} /> Free Estimates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Form */}
      <div className="mx-auto max-w-md px-6 py-10 -mt-6">
        {step === "form" ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-center mb-1">{page.cta_text}</h2>
            <p className="text-xs text-gray-400 text-center mb-5">No commitment. No spam. Just a free quote.</p>

            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name *"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder="Phone Number *"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email (optional)"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Property Address *"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
            <p className="mt-3 text-[10px] text-gray-500 text-center">
              By submitting, you agree to be contacted about your roofing project.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12" style={{ color: brandColor }} />
            <h2 className="text-xl font-bold mb-2">Thank You!</h2>
            <p className="text-sm text-gray-400 mb-4">
              We&apos;ve received your request. {companyName} will contact you shortly with your free estimate.
            </p>
            {branding.phone && (
              <a
                href={`tel:${branding.phone}`}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors"
                style={{ backgroundColor: brandColor }}
              >
                <Phone className="h-4 w-4" /> Call Us Now: {branding.phone}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center">
        <p className="text-sm font-semibold text-gray-300">{companyName}</p>
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500">
          {branding.phone && (
            <a href={`tel:${branding.phone}`} className="flex items-center gap-1 hover:text-gray-300">
              <Phone className="h-3 w-3" /> {branding.phone}
            </a>
          )}
          {branding.email && (
            <a href={`mailto:${branding.email}`} className="flex items-center gap-1 hover:text-gray-300">
              <Mail className="h-3 w-3" /> {branding.email}
            </a>
          )}
        </div>
        <p className="mt-3 text-[10px] text-gray-600">Powered by XRoof</p>
      </footer>
    </div>
  )
}
