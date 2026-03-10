"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CheckCircle, AlertCircle, Clock, MapPin, Phone, Mail, DollarSign, FileText, Wrench, MessageSquare, User } from "lucide-react"

type Report = {
  id: string
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
}

export default function PublicEstimatePage() {
  const params = useParams()
  const token = params.token as string

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<"expired" | "invalid" | null>(null)
  const [interested, setInterested] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/reports/_?token=${token}`)
        if (res.status === 410) { setErrorState("expired"); setLoading(false); return }
        if (res.status === 404) { setErrorState("invalid"); setLoading(false); return }

        const data = await res.json()
        if (data.error) { setErrorState("invalid"); setLoading(false); return }
        setReport(data)
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
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        setInterested(true)
      }
    } catch {
      alert("Something went wrong. Please try again.")
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
          <Clock className="mx-auto mb-4 h-12 w-12 text-amber-500" />
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
          <h1 className="mb-2 text-xl font-bold text-gray-900">Thank You!</h1>
          <p className="text-sm text-gray-600">
            Your contractor has been notified. {report.company_name || report.contractor_name} will reach out to you shortly to discuss next steps.
          </p>
        </div>
      </div>
    )
  }

  const visiblePhotos = (report.photo_urls || [])
    .map((url, i) => ({ url, caption: report.photo_captions?.[i] || "", visible: report.photo_visible?.[i] !== false }))
    .filter((p) => p.url && p.visible)

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-4 rounded-xl bg-emerald-600 p-4 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Roof Estimate</p>
          <h1 className="mt-1 text-lg font-bold">{report.company_name || report.contractor_name}</h1>
          {report.company_phone && <p className="mt-1 text-xs opacity-70">{report.company_phone}</p>}
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
              <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-gray-400" /> {report.customer_name}</p>
              <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gray-400" /> {report.customer_address}</p>
              {report.customer_phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gray-400" /> {report.customer_phone}</p>}
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
                  <div key={i} className="overflow-hidden rounded-lg">
                    <img src={photo.url} alt={photo.caption || `Photo ${i + 1}`} className="w-full h-32 object-cover" />
                    {photo.caption && <p className="mt-1 text-[10px] text-gray-400 text-center">{photo.caption}</p>}
                  </div>
                ))}
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

          {/* Estimated Cost */}
          {report.price_quote != null && report.price_quote > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <DollarSign className="h-3.5 w-3.5" /> Estimated Cost
              </h3>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <p className="text-2xl font-bold text-gray-900">${Number(report.price_quote).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Estimate valid for 30 days</p>
              </div>
            </div>
          )}

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
          <button
            onClick={handleInterested}
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Sending..." : "I'm Interested — Let's Move Forward"}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          {report.company_name && (
            <p className="text-xs text-gray-400">
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
