"use client"

import { use, useEffect, useState } from "react"
import { MapPin, Phone, Mail, Calendar, Hash, Printer } from "lucide-react"

type ReportView = {
  id: string
  company_name: string
  company_email: string
  company_phone: string
  logo_url: string | null
  customer_name: string
  customer_address: string
  customer_phone: string
  job_type: string
  roof_squares: number | null
  roof_pitch: string | null
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
  created_at: string
  measurement_data: any
  materials_visible: boolean
}

export default function ReportViewPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = use(params)
  const [report, setReport] = useState<ReportView | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      const res = await fetch(`/api/reports/${reportId}`)
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      }
      setLoading(false)
    }
    fetchReport()
  }, [reportId])

  if (loading) return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground">Loading report...</p></div>
  if (!report) return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground">Report not found.</p></div>

  const reportDate = new Date(report.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })

  const visiblePhotos = report.photo_urls
    .map((url, i) => ({ url, caption: report.photo_captions?.[i] || "", visible: report.photo_visible?.[i] !== false }))
    .filter((p) => p.visible && p.url)

  return (
    <div className="min-h-screen bg-background">
      {/* Print button — hidden in print */}
      <div className="print:hidden flex items-center justify-center gap-4 py-6">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </button>
        <button
          onClick={() => window.close()}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          Close
        </button>
      </div>

      {/* Report Content */}
      <div className="mx-auto max-w-3xl print:max-w-none print:mx-0">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
          {/* Green accent bar */}
          <div className="h-2 bg-primary print:bg-[#14532d]" />

          <div className="p-8 print:p-10 print:text-black print:bg-white">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
              <div>
                {report.logo_url && (
                  <img
                    src={report.logo_url}
                    alt="Company logo"
                    className="mb-3 h-14 max-w-[180px] object-contain"
                  />
                )}
                {report.company_name && (
                  <p className="text-xl font-bold text-foreground print:text-black">{report.company_name}</p>
                )}
                {report.company_email && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground print:text-gray-600">
                    <Mail className="h-3.5 w-3.5" />
                    {report.company_email}
                  </p>
                )}
                {report.company_phone && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground print:text-gray-600">
                    <Phone className="h-3.5 w-3.5" />
                    {report.company_phone}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary print:text-[#14532d]">ROOF ESTIMATE</p>
                <p className="mt-1 flex items-center justify-end gap-2 text-sm text-muted-foreground print:text-gray-600">
                  <Hash className="h-3.5 w-3.5" />
                  {report.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="flex items-center justify-end gap-2 text-sm text-muted-foreground print:text-gray-600">
                  <Calendar className="h-3.5 w-3.5" />
                  {reportDate}
                </p>
              </div>
            </div>

            <hr className="mb-6 border-border print:border-gray-300" />

            {/* Property Info */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary print:text-[#14532d]">
                Property Information
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {report.customer_name && (
                  <div>
                    <span className="text-xs text-muted-foreground print:text-gray-500">Customer</span>
                    <p className="font-medium text-foreground print:text-black">{report.customer_name}</p>
                  </div>
                )}
                {report.customer_phone && (
                  <div>
                    <span className="text-xs text-muted-foreground print:text-gray-500">Phone</span>
                    <p className="font-medium text-foreground print:text-black">{report.customer_phone}</p>
                  </div>
                )}
                {report.customer_address && (
                  <div>
                    <span className="text-xs text-muted-foreground print:text-gray-500">Address</span>
                    <p className="flex items-center gap-1 font-medium text-foreground print:text-black">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground print:text-gray-500" />
                      {report.customer_address}
                    </p>
                  </div>
                )}
                {report.job_type && (
                  <div>
                    <span className="text-xs text-muted-foreground print:text-gray-500">Job Type</span>
                    <p className="font-medium text-foreground print:text-black">{report.job_type}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Roof Details */}
            {(report.roof_squares || report.roof_pitch) && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary print:text-[#14532d]">
                  Roof Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {report.roof_squares && (
                    <div className="rounded-lg border border-border bg-secondary/20 p-4 text-center print:border-gray-300 print:bg-gray-50">
                      <p className="text-xs text-muted-foreground print:text-gray-500">Total Squares</p>
                      <p className="mt-1 text-2xl font-bold text-foreground print:text-black">{report.roof_squares}</p>
                    </div>
                  )}
                  {report.roof_pitch && (
                    <div className="rounded-lg border border-border bg-secondary/20 p-4 text-center print:border-gray-300 print:bg-gray-50">
                      <p className="text-xs text-muted-foreground print:text-gray-500">Pitch</p>
                      <p className="mt-1 text-2xl font-bold text-foreground print:text-black">{report.roof_pitch}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Edge Measurements */}
            {report.measurement_data?.edge_totals && Object.keys(report.measurement_data.edge_totals).length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary print:text-[#14532d]">
                  Edge Measurements
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(report.measurement_data.edge_totals as Record<string, number>)
                    .filter(([, ft]) => ft > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, ft]) => (
                      <div key={type} className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-3 py-2 print:border-gray-300 print:bg-gray-50">
                        <span className="text-xs font-medium text-muted-foreground capitalize print:text-gray-500">{type.replace("_", " ")}</span>
                        <span className="text-sm font-bold text-foreground print:text-black">{Math.round(ft)} ft</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Materials Estimate */}
            {report.materials_visible && report.measurement_data?.edge_totals && (() => {
              const et = report.measurement_data.edge_totals as Record<string, number>
              const squares = report.roof_squares || report.measurement_data.order_squares || 0
              const eavesLf = et.eaves || 0
              const rakesLf = et.rakes || 0
              const ridgesLf = et.ridges || 0
              const valleysLf = et.valleys || 0
              const hipsLf = et.hips || 0

              const materials = [
                { name: "Shingles", qty: Math.ceil(squares * 3), unit: "bundles", note: `${squares} sq × 3` },
                { name: "Ridge Caps", qty: Math.ceil(ridgesLf / 20), unit: "bundles", note: `${Math.round(ridgesLf)} ft` },
                ...(hipsLf > 0 ? [{ name: "Hip & Ridge", qty: Math.ceil(hipsLf / 20), unit: "bundles", note: `${Math.round(hipsLf)} ft` }] : []),
                { name: "Drip Edge", qty: Math.ceil((eavesLf + rakesLf) / 10), unit: "pieces", note: `${Math.round(eavesLf + rakesLf)} ft` },
                { name: "Ice & Water Shield", qty: Math.ceil(eavesLf / 66), unit: "rolls", note: `${Math.round(eavesLf)} ft` },
                { name: "Starter Strip", qty: Math.ceil(eavesLf / 120), unit: "rolls", note: `${Math.round(eavesLf)} ft` },
                ...(valleysLf > 0 ? [{ name: "Valley Metal", qty: Math.ceil(valleysLf / 10), unit: "pieces", note: `${Math.round(valleysLf)} ft` }] : []),
                { name: "Underlayment", qty: Math.ceil(squares / 4), unit: "rolls", note: `${squares} sq` },
                { name: "Nails (coil)", qty: Math.ceil(squares / 3), unit: "boxes", note: `${squares} sq` },
              ]

              return (
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary print:text-[#14532d]">
                    Materials Estimate
                  </h3>
                  <div className="rounded-lg border border-border overflow-hidden print:border-gray-300">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30 print:border-gray-300 print:bg-gray-100">
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground print:text-gray-500">Material</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground print:text-gray-500">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground print:text-gray-500">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials.map((m) => (
                          <tr key={m.name} className="border-b border-border/50 last:border-0 print:border-gray-200">
                            <td className="px-3 py-2 font-medium text-foreground print:text-black">{m.name}</td>
                            <td className="px-3 py-2 text-right font-bold text-foreground print:text-black">{m.qty}</td>
                            <td className="px-3 py-2 text-muted-foreground print:text-gray-600">{m.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}

            {/* Photos */}
            {visiblePhotos.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary print:text-[#14532d]">
                  Property Photos
                </h3>
                <div className={`grid gap-3 ${visiblePhotos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {visiblePhotos.map((photo, i) => (
                    <div key={i}>
                      <img
                        src={photo.url}
                        alt={photo.caption || `Photo ${i + 1}`}
                        className="h-48 w-full rounded-lg border border-border object-cover print:border-gray-300"
                      />
                      {photo.caption && (
                        <p className="mt-1 text-center text-xs text-muted-foreground print:text-gray-500 italic">{photo.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scope of Work */}
            {report.scope_of_work && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-primary print:text-[#14532d]">
                  Scope of Work
                </h3>
                <p className="whitespace-pre-wrap text-sm text-foreground print:text-black">{report.scope_of_work}</p>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-primary print:text-[#14532d]">
                  Recommendations
                </h3>
                <p className="whitespace-pre-wrap text-sm text-foreground print:text-black">{report.recommendations}</p>
              </div>
            )}

            {/* Estimated Cost */}
            {report.price_quote != null && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-primary print:text-[#14532d]">
                  Estimated Cost
                </h3>
                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 print:border-[#14532d]/30 print:bg-green-50">
                  <p className="text-3xl font-bold text-foreground print:text-black">
                    ${report.price_quote.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground print:text-gray-500">
                    Estimate valid for 30 days from {reportDate}.
                  </p>
                </div>
              </div>
            )}

            {/* Material */}
            {report.material && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-primary print:text-[#14532d]">
                  Material
                </h3>
                <p className="text-sm text-foreground print:text-black">{report.material}</p>
              </div>
            )}

            {/* Notes */}
            {report.notes && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-primary print:text-[#14532d]">
                  Notes
                </h3>
                <p className="whitespace-pre-wrap text-sm text-foreground print:text-black">{report.notes}</p>
              </div>
            )}

            <hr className="mb-6 border-border print:border-gray-300" />

            {/* Prepared By */}
            {(report.worker_name || report.worker_title || report.worker_phone) && (
              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-primary print:text-[#14532d]">
                  Prepared By
                </h3>
                <div className="text-sm">
                  {report.worker_name && (
                    <p className="font-semibold text-foreground print:text-black">{report.worker_name}</p>
                  )}
                  {report.worker_title && (
                    <p className="text-muted-foreground print:text-gray-600">{report.worker_title}</p>
                  )}
                  {report.worker_phone && (
                    <p className="flex items-center gap-1 text-muted-foreground print:text-gray-600">
                      <Phone className="h-3 w-3" />
                      {report.worker_phone}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground print:text-gray-500">{reportDate}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
