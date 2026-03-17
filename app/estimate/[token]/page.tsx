"use client"

import { darkenColor, lightenColor, colorWithOpacity } from "@/lib/brand-colors"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CheckCircle, AlertCircle, Clock, MapPin, Phone, Mail, DollarSign, FileText, Wrench, MessageSquare, User, Download, X, ChevronLeft, ChevronRight, HelpCircle, Send, List, Package } from "lucide-react"
import { useToast } from "@/lib/toast-context"
import { GoogleReviewsBadge } from "@/components/google-reviews-badge"

type PricingTier = {
  name: string
  description: string
  price: number | null
}

type EstimateLineItem = {
  description: string
  quantity: number
  unit_price: number
}

type CatalogItem = {
  id: string
  brand: string
  product_line: string
  color: string
  description: string | null
  image_url: string | null
  price_tier: string | null
}

type MaterialBrand = {
  name: string
  products: CatalogItem[]
}

const SWATCH_COLORS: Record<string, string> = {
  "charcoal": "#3a3a3a", "onyx black": "#1a1a1a", "moire black": "#222222",
  "dual black": "#1e1e1e", "rustic black": "#252525", "shadow black": "#2a2a2a",
  "pristine black": "#1c1c1c", "midnight black": "#181818", "black": "#1a1a1a",
  "carbon": "#2a2c2e", "max def moire black": "#222222",
  "pewter gray": "#7a7d7e", "slate": "#5a6370", "estate gray": "#6b6e70",
  "georgetown gray": "#5e6264", "pewter": "#8a8d8f", "cobblestone gray": "#6d7072",
  "fox hollow gray": "#5f6366", "oyster gray": "#9a9c98", "quarry gray": "#6e7173",
  "sierra gray": "#7e8185", "castle gray": "#686c6e", "hearthstone gray": "#6a6e72",
  "thunderstorm gray": "#5c5f63", "mountain slate": "#5b6068", "dual gray": "#707478",
  "charcoal gray": "#404448", "pewterwood": "#6b6560", "granite gray": "#686c70",
  "shadow gray": "#505458", "coastal gray": "#6e7478", "storm grey": "#5a5e62",
  "silverwood": "#8a8e90", "thunderstorm grey": "#4e5258", "slate gray": "#5a6068",
  "colonial slate": "#5a5e64", "williamsburg gray": "#5e6468", "silver birch": "#9a9e98",
  "platinum gray": "#8a8c90", "ash gray": "#6e7276", "dove gray": "#8e9094",
  "max def pewter gray": "#7a7d7e", "charcoal blend": "#3e4042",
  "weathered wood": "#6e5d4e", "hickory": "#7a6148", "barkwood": "#6a5545",
  "shakewood": "#7d6b55", "mission brown": "#5e4a3a", "driftwood": "#8a7e6e",
  "brownwood": "#5e4e3e", "teak": "#6e5840", "resawn shake": "#756050",
  "burnt sienna": "#8b5a3a", "brownstone": "#6b5848", "natural timber": "#8a7558",
  "aged wood": "#7e6e5e", "rustic cedar": "#8a6240", "earthtone cedar": "#7a6045",
  "weatherwood": "#6e5e50", "sedona canyon": "#8b6850", "sedona": "#9a6848",
  "antique brown": "#6a5040", "natural wood": "#7a6850", "autumn": "#7a5838",
  "autumn blend": "#7a5a40", "black walnut": "#3a2e28", "brownstone blend": "#6a5a48",
  "max def weathered wood": "#6e5d4e", "max def driftwood": "#8a7e6e",
  "chestnut": "#5e4030", "walnut": "#5a4230", "pecan": "#7a5e40",
  "bark": "#5e4e40", "bark (metal)": "#5e4e40", "tahoe": "#4e4640",
  "cocoa": "#5a4838", "cafe": "#7a6a58", "mocha": "#5e4a3c", "villa blend": "#8a7058",
  "shadowood": "#5a4e42", "european": "#5e5650", "castle": "#686058",
  "sand dune": "#b8a888", "desert tan": "#baa878", "desert shake": "#9a8868",
  "birchwood": "#a09080", "heather blend": "#8a7e72", "sandalwood": "#a08868",
  "white oak": "#c0b8a8", "capri": "#9a8878", "santa fe": "#c09068",
  "hunter green": "#3a5040", "chateau green": "#3e5a48", "cascade green": "#3a5a48",
  "forest green": "#2e4a38", "forest green (metal)": "#2e4a38",
  "harbor blue": "#4a5a6e", "appalachian sky": "#5a6878", "glacier": "#8a9aa8",
  "aged redwood": "#7a4838", "harvard slate": "#5a4858", "sierra brown": "#7a5a42",
  "colonial red": "#8a3a30", "terra cotta": "#c05a3a", "terracotta (metal)": "#b85838",
  "red blend": "#8a4238", "mesa red": "#9a4a38", "pacific redwood": "#6a3a30",
  "adobe sunset": "#b07050",
  "multi-width slate": "#5a5e62", "stone (metal)": "#8a8680", "charcoal (metal)": "#3a3c3e",
}

function getSwatchColor(colorName: string): string {
  return SWATCH_COLORS[colorName.toLowerCase()] || "#6b7280"
}

const PRODUCT_VALUES: Record<string, string> = {
  "Timberline HD": "30-year warranty, architectural style",
  "Timberline HDZ": "StrikeZone nailing, 130 mph wind, algae protection",
  "Timberline UHDZ": "Ultra-premium layered look, 130 mph wind, lifetime warranty",
  "StormMaster Slate": "Class 4 impact resistant, Scotchgard algae protection",
  "Pinnacle Pristine": "Scotchgard algae protection, 130 mph wind",
  "Architectural": "Economy architectural, 110 mph wind rating",
  "Duration": "SureNail technology, 130 mph wind, algae resistance",
  "Landmark": "Max Def colors, algae resistance, 110 mph wind",
  "Landmark PRO": "Max Def colors, 130 mph wind, 15-year algae warranty",
  "Cambridge": "Dual-layer laminate, algae resistance",
  "Dynasty": "ArmourZone nailing, 130 mph wind, impact resistant",
  "Heritage": "3-piece lamination, algae resistant",
  "Vista AR": "Smog-reducing granules, algae protection",
  "Legacy": "Scotchgard algae protection, NEX polymer modified",
  "Highlander NEX": "Class 4 impact, Max Def, recycled content",
  "Paramount": "Algae resistant, 110 mph wind rating",
  "Premier": "Algae resistant, 130 mph wind rating",
  "Bellaforté Slate": "Synthetic slate, lifetime warranty, Class 4 impact, fire resistant",
  "Bellaforté Shake": "Synthetic shake, lifetime warranty, Class 4 impact, fire resistant",
  "Metal Shingle Plus": "Stone-coated steel, 120 mph wind, fire & hail resistant",
  "Metal Shake": "Stone-coated steel shake profile, 120 mph wind resistant",
  "Metal Tile": "Stone-coated steel tile, 120 mph wind, energy efficient",
  "Barcelona 900": "Concrete tile, 50+ year lifespan, fire resistant",
  "Saxony Slate": "Concrete slate profile, fire resistant, energy efficient",
  "Capistrano": "Concrete S-tile, 50+ year lifespan, fire resistant",
  "Bel Air": "Concrete flat tile, fire resistant, energy efficient",
  "3-Tab": "Economy 3-tab, 25-year warranty",
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  economy: { label: "$", color: "bg-gray-500 text-white" },
  mid: { label: "$$", color: "bg-blue-500 text-white" },
  premium: { label: "$$$", color: "bg-amber-500 text-white" },
  luxury: { label: "$$$$", color: "bg-purple-500 text-white" },
}

type Report = {
  id: string
  job_id: string
  company_name: string
  company_email: string
  company_phone: string
  logo_url: string
  customer_name: string
  customer_address: string
  customer_phone: string
  job_type: string
  roof_squares: number | null
  roof_pitch: string
  photo_urls: string[]
  photo_captions: string[]
  photo_visible: boolean[]
  scope_of_work: string
  recommendations: string
  price_quote: number | null
  material: string
  notes: string
  worker_name: string
  worker_title: string
  worker_phone: string
  contractor_name: string
  pricing_tiers: PricingTier[] | null
  deposit_percent: number | null
  estimate_line_items: EstimateLineItem[] | null
  estimate_accepted: boolean
  accepted_tier_index: number | null
  brand_color: string
  brand_logo_url: string
  google_review_url: string
  google_reviews_cache: { rating: number; reviewCount: number } | null
}

export default function PublicEstimatePage() {
  const params = useParams()
  const token = params.token as string
  const toast = useToast()

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<"expired" | "invalid" | null>(null)
  const [interested, setInterested] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedTier, setSelectedTier] = useState<number | null>(null)
  const [questionName, setQuestionName] = useState("")
  const [questionMsg, setQuestionMsg] = useState("")
  const [questionSent, setQuestionSent] = useState(false)
  const [sendingQuestion, setSendingQuestion] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [materialBrands, setMaterialBrands] = useState<MaterialBrand[]>([])
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set())
  const [selectingMaterial, setSelectingMaterial] = useState<string | null>(null)
  const [showMaterials, setShowMaterials] = useState(false)

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/reports/_/pdf?token=${token}`)
      if (!res.ok) throw new Error("PDF generation failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Proposal-${report?.customer_name || "estimate"}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("PDF download failed. Please try again.")
    }
    setDownloading(false)
  }

  // SEO: dynamic document title and meta description
  useEffect(() => {
    if (!report) return
    const company = report.company_name || report.contractor_name || "Your Contractor"
    document.title = `Estimate from ${company} | ${company}`
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!metaDesc) {
      metaDesc = document.createElement("meta")
      metaDesc.name = "description"
      document.head.appendChild(metaDesc)
    }
    metaDesc.content = `Roofing estimate for ${report.customer_name} from ${company}. View scope of work, pricing, and photos.`
  }, [report])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/reports/_?token=${token}`)
        if (res.status === 410) { setErrorState("expired"); setLoading(false); return }
        if (res.status === 404) { setErrorState("invalid"); setLoading(false); return }

        const data = await res.json()
        if (data.error) { setErrorState("invalid"); setLoading(false); return }
        setReport(data)
        if (data.estimate_accepted && data.accepted_tier_index != null) {
          setSelectedTier(data.accepted_tier_index)
        }
        // Fetch material catalog — prefer job_id, fall back to contractor_id
        const materialParam = data.job_id
          ? `job_id=${data.job_id}`
          : data.contractor_id
            ? `contractor_id=${data.contractor_id}`
            : null
        if (materialParam) {
          fetch(`/api/portal/materials?${materialParam}`)
            .then(r => r.ok ? r.json() : null)
            .then(json => {
              if (json) {
                setMaterialBrands(json.brands || [])
                setSelectedMaterialIds(new Set(json.selectedIds || []))
              }
            })
            .catch(() => {})
        }
      } catch {
        setErrorState("invalid")
      }
      setLoading(false)
    }
    load()
  }, [token])

  const handleInterested = async () => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/reports/interested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, selected_tier: selectedTier }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        setInterested(true)
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
    }
    setSubmitting(false)
  }

  const selectMaterial = async (catalogItemId: string) => {
    if (!report?.job_id || selectingMaterial) return
    setSelectingMaterial(catalogItemId)
    try {
      const res = await fetch("/api/portal/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: report.job_id, catalog_item_id: catalogItemId }),
      })
      if (res.ok) {
        setSelectedMaterialIds((prev) => new Set([...prev, catalogItemId]))
        toast.success("Material preference saved!")
      }
    } catch {}
    setSelectingMaterial(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading estimate...</p>
      </div>
    )
  }

  if (errorState === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <Clock className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">Link Expired</h1>
          <p className="text-sm text-gray-600">This estimate link has expired. Please contact your contractor for an updated link.</p>
        </div>
      </div>
    )
  }

  if (errorState || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">Invalid Link</h1>
          <p className="text-sm text-gray-600">This estimate link is invalid or has already been used.</p>
        </div>
      </div>
    )
  }

  if (interested) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">Estimate Accepted!</h1>
          <p className="text-sm text-gray-600">
            Your contractor has been notified. {report.company_name || report.contractor_name} will reach out to you shortly to schedule the work and send a contract.
          </p>
        </div>
      </div>
    )
  }

  const alreadyAccepted = !!report?.estimate_accepted

  const visiblePhotos = (report.photo_urls || [])
    .map((url, i) => ({ url, caption: report.photo_captions?.[i] || "", visible: report.photo_visible?.[i] !== false }))
    .filter((p) => p.url && p.visible)

  const brandColor = report.brand_color || "#059669"
  const brandDark = darkenColor(brandColor, 30)
  const brandLight = lightenColor(brandColor, 90)
  const brandRing = colorWithOpacity(brandColor, 0.3)

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Download PDF button */}
        <div className="mb-3 flex justify-end">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? "Generating..." : "Download PDF"}
          </button>
        </div>

        <div id="estimate-content">
        {/* Header */}
        <div className="mb-4 rounded-xl p-4 text-center text-white" style={{ backgroundColor: brandDark }}>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Roof Estimate</p>
          <h1 className="mt-1 text-lg font-bold">{report.company_name || report.contractor_name}</h1>
          {report.company_phone && <p className="mt-1 text-xs opacity-70">{report.company_phone}</p>}
          {report.google_reviews_cache && (
            <div className="mt-2 flex justify-center">
              <GoogleReviewsBadge
                rating={report.google_reviews_cache.rating}
                reviewCount={report.google_reviews_cache.reviewCount}
                reviewUrl={report.google_review_url}
                className="text-white/90"
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {/* Company Logo */}
          {report.logo_url && (
            <div className="mb-4 text-center">
              <img src={report.logo_url} alt="Company logo" className="mx-auto h-16 object-contain" />
            </div>
          )}

          {/* Customer Info */}
          <div className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Property Information</h3>
            <div className="space-y-1 text-sm text-gray-900">
              <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-gray-500" /> {report.customer_name}</p>
              <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gray-500" /> {report.customer_address}</p>
              {report.customer_phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gray-500" /> {report.customer_phone}</p>}
              {report.job_type && <p className="text-gray-500 text-xs mt-1">Type: {report.job_type}</p>}
            </div>
          </div>

          {/* Roof Details */}
          {(report.roof_squares || report.roof_pitch) && (
            <div className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Roof Details</h3>
              <div className="flex gap-4 text-sm">
                {report.roof_squares && <p><strong>Squares:</strong> {report.roof_squares}</p>}
                {report.roof_pitch && <p><strong>Pitch:</strong> {report.roof_pitch}</p>}
              </div>
            </div>
          )}

          {/* Property Photos */}
          {visiblePhotos.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Property Photos</h3>
              <div className="grid grid-cols-2 gap-2">
                {visiblePhotos.map((photo, i) => (
                  <button key={i} onClick={() => setLightboxIndex(i)} className="overflow-hidden rounded-lg text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400">
                    <img src={photo.url} alt={photo.caption || `Photo ${i + 1}`} className="w-full h-32 object-cover transition-transform hover:scale-105" />
                    {photo.caption && <p className="mt-1 text-[10px] text-gray-500 text-center">{photo.caption}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photo Lightbox */}
          {lightboxIndex !== null && visiblePhotos[lightboxIndex] && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightboxIndex(null)}>
              <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors">
                <X className="h-5 w-5" />
              </button>
              {visiblePhotos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + visiblePhotos.length) % visiblePhotos.length) }}
                    className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % visiblePhotos.length) }}
                    className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              <div className="max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                <img
                  src={visiblePhotos[lightboxIndex].url}
                  alt={visiblePhotos[lightboxIndex].caption || "Photo"}
                  className="max-h-[80vh] max-w-full rounded-lg object-contain"
                />
                {visiblePhotos[lightboxIndex].caption && (
                  <p className="mt-2 text-center text-sm text-white/70">{visiblePhotos[lightboxIndex].caption}</p>
                )}
                <p className="mt-1 text-center text-xs text-white/40">{lightboxIndex + 1} / {visiblePhotos.length}</p>
              </div>
            </div>
          )}

          {/* Scope of Work */}
          {report.scope_of_work && (
            <div className="mb-6">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <FileText className="h-3.5 w-3.5" /> Scope of Work
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.scope_of_work}</p>
            </div>
          )}

          {/* Line Items Breakdown */}
          {report.estimate_line_items && report.estimate_line_items.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <List className="h-3.5 w-3.5" /> Cost Breakdown
              </h3>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-[1fr_50px_70px_70px] gap-2 bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">
                  <span>Item</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Amount</span>
                </div>
                {report.estimate_line_items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_50px_70px_70px] gap-2 border-t border-gray-100 px-3 py-2 text-sm">
                    <span className="text-gray-800">{item.description}</span>
                    <span className="text-center text-gray-500">{item.quantity}</span>
                    <span className="text-right text-gray-500">${item.unit_price.toLocaleString()}</span>
                    <span className="text-right font-medium text-gray-900">${(item.quantity * item.unit_price).toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t-2 border-gray-200 px-3 py-2 flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Total</span>
                  <span className="text-lg font-bold text-gray-900">
                    ${report.estimate_line_items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Tiers */}
          {report.pricing_tiers && report.pricing_tiers.length > 0 ? (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <DollarSign className="h-3.5 w-3.5" /> {alreadyAccepted ? "Your Selected Option" : "Choose Your Option"}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {report.pricing_tiers.map((tier, i) => (
                  <button
                    key={i}
                    onClick={() => { if (!alreadyAccepted) setSelectedTier(i) }}
                    className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                      alreadyAccepted ? "cursor-default" : ""
                    } ${
                      selectedTier === i
                        ? ""
                        : alreadyAccepted ? "border-gray-200 opacity-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={selectedTier === i ? { borderColor: brandColor, backgroundColor: brandLight, boxShadow: `0 0 0 2px ${brandRing}` } : i === 1 ? { borderColor: colorWithOpacity(brandColor, 0.3), backgroundColor: colorWithOpacity(brandColor, 0.05) } : undefined}
                  >
                    {i === 1 && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: brandDark }}>
                        POPULAR
                      </span>
                    )}
                    <p className="text-sm font-bold text-gray-900">{tier.name}</p>
                    {tier.description && <p className="mt-1 text-xs text-gray-500">{tier.description}</p>}
                    {tier.price != null && (
                      <p className="mt-2 text-xl font-bold text-gray-900">${Number(tier.price).toLocaleString()}</p>
                    )}
                    {selectedTier === i && (
                      <CheckCircle className="absolute right-3 top-3 h-5 w-5" style={{ color: brandColor }} />
                    )}
                  </button>
                ))}
              </div>
              {report.deposit_percent != null && report.deposit_percent > 0 && selectedTier !== null && report.pricing_tiers?.[selectedTier]?.price && (
                <p className="mt-2 text-center text-xs text-gray-500">
                  {report.deposit_percent}% deposit: ${Math.round(report.pricing_tiers[selectedTier].price * report.deposit_percent / 100).toLocaleString()}
                </p>
              )}
            </div>
          ) : report.price_quote != null && report.price_quote > 0 ? (
            <div className="mb-6">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <DollarSign className="h-3.5 w-3.5" /> Estimated Cost
              </h3>
              <div className="rounded-xl border p-4" style={{ backgroundColor: brandLight, borderColor: colorWithOpacity(brandColor, 0.3) }}>
                <p className="text-2xl font-bold text-gray-900">${Number(report.price_quote).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Estimate valid for 30 days</p>
              </div>
            </div>
          ) : null}

          {/* Material */}
          {report.material && (
            <div className="mb-6">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <Wrench className="h-3.5 w-3.5" /> Material
              </h3>
              <p className="text-sm text-gray-700">{report.material}</p>
            </div>
          )}

          {/* Material Catalog Picker */}
          {materialBrands.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowMaterials(!showMaterials)}
                className="mb-3 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50"
              >
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <Package className="h-3.5 w-3.5" /> Browse Available Materials & Colors
                </span>
                <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${showMaterials ? "rotate-90" : ""}`} />
              </button>
              {showMaterials && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  {selectedMaterialIds.size > 0 && (
                    <p className="mb-3 text-xs text-emerald-600 font-medium">
                      {selectedMaterialIds.size} material{selectedMaterialIds.size > 1 ? "s" : ""} selected
                    </p>
                  )}
                  {!report?.job_id && (
                    <p className="mb-3 text-xs text-gray-500 italic">
                      Browse available materials below. Contact your contractor to discuss preferences.
                    </p>
                  )}
                  <div className="flex flex-col gap-5">
                    {materialBrands.map((brand) => (
                      <div key={brand.name}>
                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{brand.name}</h4>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {brand.products.map((item) => {
                            const isSelected = selectedMaterialIds.has(item.id)
                            const tier = item.price_tier ? TIER_LABELS[item.price_tier] : null
                            const valueDesc = PRODUCT_VALUES[item.product_line]
                            return (
                              <div
                                key={item.id}
                                className={`rounded-lg border p-3 transition-colors ${
                                  isSelected
                                    ? "border-emerald-500/40 bg-emerald-50"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt={item.color} className="h-10 w-10 rounded-lg object-cover flex-shrink-0 border border-gray-200" />
                                  ) : (
                                    <div
                                      className="h-10 w-10 rounded-lg flex-shrink-0 border border-gray-200"
                                      style={{
                                        backgroundColor: getSwatchColor(item.color),
                                        backgroundImage: [
                                          "radial-gradient(ellipse 2px 1.5px at 20% 25%, rgba(255,255,255,0.18) 0%, transparent 100%)",
                                          "radial-gradient(ellipse 2px 1.5px at 70% 15%, rgba(0,0,0,0.22) 0%, transparent 100%)",
                                          "radial-gradient(ellipse 1.5px 1px at 45% 55%, rgba(255,255,255,0.15) 0%, transparent 100%)",
                                          "radial-gradient(ellipse 2px 1px at 80% 70%, rgba(0,0,0,0.18) 0%, transparent 100%)",
                                          "repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 5px)",
                                          "repeating-linear-gradient(0deg, transparent 0px, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 6px)",
                                          "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.15) 58%, rgba(0,0,0,0.12) 62%, transparent 65%)",
                                          "linear-gradient(145deg, rgba(255,255,255,0.1) 0%, transparent 35%, rgba(0,0,0,0.12) 100%)",
                                        ].join(", "),
                                      }}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">{item.color}</p>
                                    <p className="text-[11px] text-gray-500">{item.product_line}</p>
                                    {valueDesc && (
                                      <p className="mt-0.5 text-[10px] text-gray-400">{valueDesc}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                  {tier ? (
                                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${tier.color}`}>
                                      {tier.label} {item.price_tier}
                                    </span>
                                  ) : <span />}
                                  {isSelected ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                      <CheckCircle className="h-3 w-3" /> Selected
                                    </span>
                                  ) : report?.job_id ? (
                                    <button
                                      onClick={() => selectMaterial(item.id)}
                                      disabled={selectingMaterial === item.id}
                                      className="rounded-lg px-3 py-1 text-[11px] font-bold text-white transition-colors disabled:opacity-50"
                                      style={{ backgroundColor: brandColor }}
                                    >
                                      {selectingMaterial === item.id ? "..." : "Select"}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations && (
            <div className="mb-6">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <MessageSquare className="h-3.5 w-3.5" /> Recommendations
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.recommendations}</p>
            </div>
          )}

          {/* Notes */}
          {report.notes && (
            <div className="mb-6">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <FileText className="h-3.5 w-3.5" /> Additional Notes
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.notes}</p>
            </div>
          )}

          {/* Prepared By */}
          {report.worker_name && (
            <div className="mb-6 rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Prepared by</p>
              <p className="text-sm font-medium text-gray-900">{report.worker_name}</p>
              {report.worker_title && <p className="text-xs text-gray-500">{report.worker_title}</p>}
              {report.worker_phone && <p className="text-xs text-gray-500">{report.worker_phone}</p>}
            </div>
          )}

          {/* Interested Button */}
          {alreadyAccepted ? (
            <div className="w-full rounded-xl px-6 py-3.5 text-center text-sm font-bold text-white bg-emerald-600 flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Estimate Accepted
            </div>
          ) : (
            <button
              onClick={handleInterested}
              disabled={submitting || !!(report.pricing_tiers && report.pricing_tiers.length > 0 && selectedTier === null)}
              className="w-full rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: brandDark }}
            >
              {submitting
                ? "Submitting..."
                : report.pricing_tiers && selectedTier !== null
                  ? `Accept "${report.pricing_tiers?.[selectedTier]?.name}" Option`
                  : report.pricing_tiers && report.pricing_tiers.length > 0
                    ? "Select an option above"
                    : "Accept Estimate — Let's Move Forward"
              }
            </button>
          )}

          {/* Have a Question? */}
          <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <HelpCircle className="h-4 w-4 text-gray-500" /> Have a Question About This Estimate?
            </h3>
            {questionSent ? (
              <div className="flex items-center gap-2 rounded-lg p-3" style={{ backgroundColor: brandLight }}>
                <CheckCircle className="h-4 w-4" style={{ color: brandColor }} />
                <p className="text-sm" style={{ color: brandColor }}>Your question has been sent! The contractor will get back to you shortly.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={questionName}
                  onChange={(e) => setQuestionName(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                />
                <textarea
                  placeholder="Type your question here..."
                  value={questionMsg}
                  onChange={(e) => setQuestionMsg(e.target.value)}
                  rows={3}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 resize-none"
                />
                <button
                  onClick={async () => {
                    if (!questionMsg.trim() || !report) return
                    setSendingQuestion(true)
                    try {
                      await fetch("/api/portal/messages", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          job_id: report.job_id,
                          sender: "homeowner",
                          message: `[Question from ${questionName.trim() || "Homeowner"} on estimate]\n${questionMsg.trim()}`,
                        }),
                      })
                      setQuestionSent(true)
                    } catch {}
                    setSendingQuestion(false)
                  }}
                  disabled={sendingQuestion || !questionMsg.trim()}
                  className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: brandDark }}
                >
                  <Send className="h-3.5 w-3.5" />
                  {sendingQuestion ? "Sending..." : "Send Question"}
                </button>
              </div>
            )}
          </div>
        </div>
        </div>{/* end estimate-content */}

        {/* Footer */}
        <div className="mt-4 text-center">
          {report.company_name && (
            <p className="text-xs text-gray-500">
              {report.company_name}
              {report.company_phone ? ` | ${report.company_phone}` : ""}
              {report.company_email ? ` | ${report.company_email}` : ""}
            </p>
          )}
          <p className="mt-1 text-[10px] text-gray-300">Powered by XRoof</p>
        </div>
      </div>
    </div>
  )
}
