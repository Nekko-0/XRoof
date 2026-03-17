"use client"

import { darkenColor, lightenColor, colorWithOpacity } from "@/lib/brand-colors"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CheckCircle, AlertCircle, Clock, MapPin, Phone, Mail, DollarSign, FileText, Wrench, MessageSquare, User, Download, X, ChevronLeft, ChevronRight, HelpCircle, Send, List, ExternalLink } from "lucide-react"
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
    const portalUrl = report.job_id ? `/portal/${report.job_id}` : null
    if (portalUrl) {
      setTimeout(() => { window.location.href = portalUrl }, 3000)
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">Estimate Accepted!</h1>
          <p className="text-sm text-gray-600">
            Your contractor has been notified. {report.company_name || report.contractor_name} will reach out to you shortly to schedule the work and send a contract.
          </p>
          {portalUrl && (
            <>
              <p className="mt-3 text-xs text-gray-400">Redirecting to your project portal...</p>
              <a
                href={portalUrl}
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: report.brand_color || "#059669" }}
              >
                <ExternalLink className="h-4 w-4" />
                View Your Project Portal
              </a>
            </>
          )}
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
              <p className="mt-2 text-center text-[11px] text-gray-400 italic">
                Final price may vary based on material selection, hidden wood damage, or other unforeseen conditions.
              </p>
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
              <p className="mt-2 text-[11px] text-gray-400 italic">
                Final price may vary based on material selection, hidden wood damage, or other unforeseen conditions.
              </p>
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
