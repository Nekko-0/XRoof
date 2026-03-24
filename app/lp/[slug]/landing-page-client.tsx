"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import {
  Shield,
  Star,
  CheckCircle,
  Lock,
  Check,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  Loader2,
  ArrowRight,
} from "lucide-react"

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

/* ─── Types ─── */

export type LandingPage = {
  id: string
  contractor_id: string
  title: string
  subtitle: string
  cta_text: string
  hero_image_url: string | null
  template: string
  services: string[] | null
  trust_badges: string[] | null
  testimonials: { quote: string; name: string; city?: string; rating?: number }[] | null
  city: string | null
  stats: { value: string; label: string }[] | null
  color_scheme: string | null
  utm_source: string | null
  utm_campaign: string | null
  // Tracking
  google_ads_id: string | null
  google_ads_label: string | null
  facebook_pixel_id: string | null
  google_analytics_id: string | null
  // Thank you
  thank_you_heading: string | null
  thank_you_message: string | null
  redirect_url: string | null
  // A/B testing
  alt_headline: string | null
}

export type Branding = {
  company_name: string
  logo_url: string | null
  widget_color: string
  phone: string | null
  email: string | null
  service_zips: string | null
  widget_price_per_sqft: number | null
  google_review_url: string | null
  google_reviews_cache: { rating: number; reviewCount: number } | null
  licensed_insured_certified: boolean | null
}

/* ─── Constants ─── */

const PROJECT_TYPES = [
  "Roof Replacement",
  "Storm Damage Repair",
  "Roof Repair",
  "Roof Inspection",
  "Gutter Installation",
  "Other",
]

/* ─── Component ─── */

export default function LandingPageClient({
  page,
  branding,
  slug,
}: {
  page: LandingPage
  branding: Branding
  slug: string
}) {
  const searchParams = useSearchParams()
  const formRef = useRef<HTMLDivElement>(null)

  // Form state
  const [step, setStep] = useState<"form" | "submitted">("form")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [zip, setZip] = useState("")
  const [projectType, setProjectType] = useState("")
  const [projectDescription, setProjectDescription] = useState("")
  const [consentGiven, setConsentGiven] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  // A/B headline testing
  const [headlineVariant, setHeadlineVariant] = useState<"A" | "B">("A")

  useEffect(() => {
    if (page.alt_headline) {
      setHeadlineVariant(Math.random() < 0.5 ? "A" : "B")
    }
  }, [page.alt_headline])

  // UTM params
  const utmSource = searchParams.get("utm_source") || page.utm_source || "landing_page"
  const utmMedium = searchParams.get("utm_medium") || "web"
  const utmCampaign = searchParams.get("utm_campaign") || page.utm_campaign || ""
  const utmTerm = searchParams.get("utm_term") || ""
  const utmContent = searchParams.get("utm_content") || ""

  // Track view on mount
  useEffect(() => {
    fetch("/api/lp/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_id: page.id }),
    }).catch(() => {})
  }, [page.id])

  const handleSubmit = async () => {
    if (submitting) return
    setFormError("")

    // Validate required fields
    if (!name.trim()) { setFormError("Full name is required."); return }
    const digitsOnly = phone.replace(/\D/g, "")
    if (digitsOnly.length < 10) { setFormError("Please enter a valid phone number."); return }
    if (!address.trim()) { setFormError("Property address is required."); return }
    if (!city.trim()) { setFormError("City is required."); return }
    if (!zip.trim()) { setFormError("ZIP code is required."); return }
    if (!projectType) { setFormError("Please select a project type."); return }
    if (!consentGiven) { setFormError("You must agree to the consent terms."); return }

    setSubmitting(true)
    try {
      const res = await fetch("/api/lp/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: page.id,
          contractor_id: page.contractor_id,
          name: name.trim(),
          phone,
          email: email.trim() || undefined,
          address: address.trim(),
          city: city.trim(),
          zip: zip.trim(),
          project_type: projectType,
          project_description: projectDescription.trim() || undefined,
          consent_given: true,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_term: utmTerm || undefined,
          utm_content: utmContent || undefined,
          headline_variant: page.alt_headline ? headlineVariant : undefined,
        }),
      })
      if (res.ok) {
        // Fire conversion tracking events
        if (window.gtag && page.google_ads_id) {
          window.gtag("event", "conversion", {
            send_to: `${page.google_ads_id}/${page.google_ads_label}`,
          })
        }
        if (window.fbq) {
          window.fbq("track", "Lead")
        }

        if (page.redirect_url) {
          // Show submitting state briefly, then redirect
          setTimeout(() => {
            window.location.href = page.redirect_url!
          }, 1000)
        } else {
          setStep("submitted")
        }
      } else {
        setFormError("Something went wrong. Please try again.")
      }
    } catch {
      setFormError("Something went wrong. Please try again.")
    }
    if (!page.redirect_url) {
      setSubmitting(false)
    }
  }

  const scrollToForm = () => {
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" })
  }

  /* ─── Derived values ─── */

  const resolveAccentColor = (): string => {
    if (page.color_scheme === "brand") return branding.widget_color || "#14b8a6"
    if (page.color_scheme && page.color_scheme.startsWith("#")) return page.color_scheme
    return branding.widget_color || "#14b8a6"
  }

  const accent = resolveAccentColor()
  const companyName = branding.company_name || "Roofing Company"
  const services = page.services?.length ? page.services : ["Roof Replacement", "Storm Damage", "Roof Repair", "Free Inspection"]
  const trustBadges = page.trust_badges?.length ? page.trust_badges : ["Licensed & Insured", "5-Star Reviews", "Free Estimates"]
  const testimonials = page.testimonials?.length ? page.testimonials : null
  const stats = page.stats?.length ? page.stats : null

  // Determine the displayed title (A/B testing)
  const displayedTitle = page.alt_headline && headlineVariant === "B"
    ? page.alt_headline
    : page.title

  // Build hero title with city highlighted in accent color
  const renderTitle = () => {
    let titleText = displayedTitle

    // If city exists but is NOT in the title text, append " in {City}"
    if (page.city && !titleText.includes(page.city)) {
      titleText = `${titleText} in ${page.city}`
    }

    if (page.city && titleText.includes(page.city)) {
      const html = titleText.replace(
        page.city,
        `<span style="color: ${accent}">${page.city}</span>`
      )
      return (
        <h1
          className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-tight text-white"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    }
    return (
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-tight text-white">
        {titleText}
      </h1>
    )
  }

  // Thank you content
  const thankYouHeading = page.thank_you_heading || "Estimate Request Received!"
  const thankYouMessage = page.thank_you_message ||
    `We've received your request. ${companyName} will contact you shortly with your free estimate.`

  /* ─── Render ─── */

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* SECTION 1 — HERO */}
      <section className="relative overflow-hidden">
        {/* Hero background image */}
        {page.hero_image_url && (
          <img
            src={page.hero_image_url}
            alt={`${companyName} roofing services`}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
            loading="eager"
            fetchPriority="high"
            width={1920}
            height={1080}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/70 via-gray-950/80 to-gray-950" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-start">
            {/* Left: Hero content */}
            <div className="flex flex-col justify-center">
              {/* Licensed badge */}
              {branding.licensed_insured_certified && (
                <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Shield className="h-3.5 w-3.5" />
                  Licensed &amp; Insured Contractor
                </div>
              )}

              {renderTitle()}

              <p className="mt-5 text-lg text-gray-300 leading-relaxed max-w-xl">
                {page.subtitle}
              </p>

              {/* Trust badges row */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-400">
                {branding.google_reviews_cache?.rating && (
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-white">{branding.google_reviews_cache.rating}</span>
                    <span>({branding.google_reviews_cache.reviewCount} reviews)</span>
                  </span>
                )}
                {trustBadges.map((badge, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i === 0 ? (
                      <Shield className="h-4 w-4" style={{ color: accent }} />
                    ) : i === 1 ? (
                      <Star className="h-4 w-4" style={{ color: accent }} />
                    ) : (
                      <CheckCircle className="h-4 w-4" style={{ color: accent }} />
                    )}
                    {badge}
                  </span>
                ))}
              </div>

              {/* Service chips */}
              <div className="mt-8 flex flex-wrap gap-2">
                {services.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium"
                    style={{
                      backgroundColor: `${accent}15`,
                      color: accent,
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* SECTION 2 — LEAD FORM */}
            <div id="lead-form" ref={formRef}>
              {step === "form" ? (
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8 ring-1 ring-amber-500/30 shadow-lg shadow-amber-500/10">
                  <h2 className="text-xl font-bold text-center text-white">
                    Get Your Free Estimate
                  </h2>
                  <p className="text-sm text-center text-gray-400 mt-1 mb-6">
                    No commitment. No pressure. Just a free quote.
                  </p>

                  <div className="space-y-3">
                    {/* Full Name */}
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name *"
                      autoComplete="name"
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ "--tw-ring-color": accent } as React.CSSProperties}
                    />

                    {/* Phone */}
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone Number *"
                      inputMode="tel"
                      autoComplete="tel"
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ "--tw-ring-color": accent } as React.CSSProperties}
                    />

                    {/* Email */}
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email (optional)"
                      inputMode="email"
                      autoComplete="email"
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ "--tw-ring-color": accent } as React.CSSProperties}
                    />

                    {/* Property Address */}
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Property Address *"
                      autoComplete="street-address"
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ "--tw-ring-color": accent } as React.CSSProperties}
                    />

                    {/* City + ZIP row */}
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City *"
                        autoComplete="address-level2"
                        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties}
                      />
                      <input
                        type="text"
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        placeholder="ZIP Code *"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties}
                      />
                    </div>

                    {/* Project Type */}
                    <div className="relative">
                      <select
                        value={projectType}
                        onChange={(e) => setProjectType(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent pr-10"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties}
                      >
                        <option value="" disabled className="text-gray-500">
                          Project Type *
                        </option>
                        {PROJECT_TYPES.map((pt) => (
                          <option key={pt} value={pt}>
                            {pt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    </div>

                    {/* Project Description (optional) */}
                    <textarea
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value.slice(0, 500))}
                      placeholder="Tell us about your project — any details help us prepare a more accurate estimate"
                      maxLength={500}
                      rows={3}
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                      style={{ "--tw-ring-color": accent } as React.CSSProperties}
                    />

                    {/* TCPA Consent */}
                    <label className="flex items-start gap-3 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={consentGiven}
                        onChange={(e) => setConsentGiven(e.target.checked)}
                        className="mt-0.5 min-w-[20px] min-h-[20px] h-4 w-4 flex-shrink-0 rounded border-gray-600 bg-gray-800 accent-teal-500"
                      />
                      <span className="text-[11px] leading-relaxed text-gray-400">
                        By submitting this form, I consent to be contacted by {companyName} via phone (including autodialed and prerecorded calls), email, and text message regarding my roofing project. Message and data rates may apply. Reply STOP to opt out at any time. This consent is not a condition of purchase. I agree to the{" "}
                        <a href={`/lp/${slug}/privacy`} className="underline hover:text-gray-300" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                        {" "}and{" "}
                        <a href={`/lp/${slug}/terms`} className="underline hover:text-gray-300" target="_blank" rel="noopener noreferrer">Terms of Service</a>.
                      </span>
                    </label>

                    {/* Error message */}
                    {formError && (
                      <p className="text-sm text-red-400 text-center">{formError}</p>
                    )}

                    {/* Submit button */}
                    <button
                      onClick={handleSubmit}
                      disabled={!consentGiven || submitting}
                      className="w-full rounded-xl py-3.5 min-h-[48px] text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:brightness-110"
                      style={{ backgroundColor: accent }}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                      {submitting
                        ? "Submitting..."
                        : page.cta_text || "Get My Free Estimate \u2192"}
                    </button>
                  </div>

                  {/* Trust footer */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Secure &amp; Encrypted
                    </span>
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3" /> No Obligation
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" /> 100% Free
                    </span>
                  </div>
                </div>
              ) : (
                /* ── Thank-you state ── */
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center ring-1 ring-amber-500/30 shadow-lg shadow-amber-500/10">
                  <CheckCircle className="mx-auto mb-4 h-14 w-14" style={{ color: accent }} />
                  <h2 className="text-2xl font-bold text-white mb-2">{thankYouHeading}</h2>
                  <p className="text-sm text-gray-400 mb-6">
                    {thankYouMessage}
                  </p>
                  {branding.phone && (
                    <a
                      href={`tel:${branding.phone}`}
                      className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white hover:brightness-110 transition-all"
                      style={{ backgroundColor: accent }}
                    >
                      <Phone className="h-4 w-4" /> Call Us Now: {branding.phone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — STATS */}
      {stats && (
        <section className="border-t border-gray-800/50 bg-gray-950 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Trusted by Homeowners
            </p>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Why{page.city ? ` ${page.city}` : ""} Chooses {companyName}
            </h2>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="rounded-xl border bg-gray-900 p-6 text-center"
                  style={{ borderColor: `${accent}30` }}
                >
                  <p className="text-3xl font-extrabold sm:text-4xl" style={{ color: accent }}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 4 — TESTIMONIALS */}
      {testimonials && (
        <section className="border-t border-gray-800/50 bg-gray-900/50 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 text-center mb-3">
              What Homeowners Say
            </p>
            <h2 className="text-2xl font-bold text-white text-center sm:text-3xl mb-10">
              Real Reviews from Real Customers
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-6"
                >
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${s <= (t.rating || 5) ? "fill-amber-400 text-amber-400" : "fill-gray-700 text-gray-700"}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm italic text-gray-300 leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      {t.city && (
                        <p className="text-xs text-gray-500">{t.city}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 5 — HOW IT WORKS */}
      <section className="border-t border-gray-800/50 bg-gray-950 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 text-center mb-3">
            Simple Process
          </p>
          <h2 className="text-2xl font-bold text-white text-center sm:text-3xl mb-12">
            How It Works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                num: "1",
                title: "Tell Us About Your Roof",
                desc: "Fill out the quick form above with your property details and project type.",
              },
              {
                num: "2",
                title: "Get Your Free Estimate",
                desc: "We\u2019ll review your project and provide a detailed, transparent quote within 24 hours.",
              },
              {
                num: "3",
                title: "Schedule Your Project",
                desc: "Approve your estimate and we\u2019ll handle everything from permits to final cleanup.",
              },
            ].map((s) => (
              <div key={s.num} className="text-center">
                <div
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold text-white mb-4"
                  style={{ backgroundColor: accent }}
                >
                  {s.num}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — CTA */}
      <section className="border-t border-gray-800/50 bg-gray-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready for a New Roof?
          </h2>
          <p className="mt-3 text-gray-400">
            Get your free estimate today. No obligation, no pressure.
          </p>
          <button
            onClick={scrollToForm}
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold text-white hover:brightness-110 transition-all"
            style={{ backgroundColor: accent }}
          >
            <ArrowRight className="h-4 w-4" />
            {page.cta_text || "Get My Free Estimate \u2192"}
          </button>
        </div>
      </section>

      {/* SECTION 7 — FOOTER */}
      <footer className="border-t border-gray-800 bg-gray-950 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-3 text-center">
            {/* Company info */}
            <p className="text-sm font-semibold text-gray-300">{companyName}</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
              {page.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {page.city}
                </span>
              )}
              {branding.service_zips && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Serving: {branding.service_zips}
                </span>
              )}
              {branding.phone && (
                <a href={`tel:${branding.phone}`} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
                  <Phone className="h-3 w-3" /> {branding.phone}
                </a>
              )}
              {branding.email && (
                <a href={`mailto:${branding.email}`} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
                  <Mail className="h-3 w-3" /> {branding.email}
                </a>
              )}
            </div>
            {branding.licensed_insured_certified && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Licensed &amp; Insured
              </span>
            )}

            {/* Legal links */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
              <a href={`/lp/${slug}/privacy`} className="hover:text-gray-300 transition-colors">Privacy Policy</a>
              <span className="text-gray-700">|</span>
              <a href={`/lp/${slug}/terms`} className="hover:text-gray-300 transition-colors">Terms of Service</a>
            </div>

            {/* Powered by + disclaimer */}
            <div className="mt-4 pt-4 border-t border-gray-800/50 max-w-lg">
              <p className="text-[11px] text-gray-600">
                Powered by XRoof
              </p>
              <p className="mt-2 text-[10px] text-gray-600 leading-relaxed">
                XRoof provides technology tools only. XRoof does not employ, endorse, or verify this contractor. Homeowners are solely responsible for verifying contractor credentials, licensing, and insurance before hiring.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
