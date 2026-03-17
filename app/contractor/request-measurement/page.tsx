"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import {
  MapPin, Clock, CheckCircle, AlertCircle, Loader2,
  Ruler, Package, FileText, Trash2, Upload, Camera,
  DollarSign, ArrowRight, Zap,
} from "lucide-react"

type ReportOrder = {
  id: string
  address: string
  roof_type: string
  urgency: string
  notes: string
  status: string
  created_at: string
  delivered_data: any
  report_type?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  requested: { label: "Pending", color: "text-amber-600", bg: "bg-amber-500/10", icon: Clock },
  in_progress: { label: "In Progress", color: "text-blue-600", bg: "bg-blue-500/10", icon: Loader2 },
  delivered: { label: "Delivered", color: "text-emerald-600", bg: "bg-emerald-500/10", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-500/10", icon: AlertCircle },
}

const TIERS = [
  {
    id: "measurements",
    name: "Measurements",
    price: 10,
    icon: Ruler,
    color: "border-blue-500 bg-blue-500/5",
    badge: null,
    features: [
      "Total roof area (sq ft)",
      "Pitch per segment",
      "Eaves, ridges, valleys",
      "Hips, rakes lengths",
      "Flashing measurements",
      "Segment breakdown",
    ],
  },
  {
    id: "full",
    name: "Full Package",
    price: 30,
    icon: Package,
    color: "border-primary bg-primary/5 ring-1 ring-primary/30",
    badge: "Best Value",
    features: [
      "Everything in Measurements",
      "Everything in Materials",
      "Branded estimate PDF",
      "Ready to send to homeowner",
      "Custom formatting",
      "Priority delivery",
    ],
  },
  {
    id: "materials",
    name: "Materials List",
    price: 5,
    icon: FileText,
    color: "border-emerald-500 bg-emerald-500/5",
    badge: null,
    features: [
      "Shingles (bundles needed)",
      "Underlayment",
      "Ice & water shield",
      "Starter strip & ridge cap",
      "Drip edge",
      "Nails & fasteners",
    ],
  },
]

export default function RequestMeasurementPage() {
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState("")
  const [orders, setOrders] = useState<ReportOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Order form
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [address, setAddress] = useState("")
  const [roofType, setRoofType] = useState("Residential")
  const [notes, setNotes] = useState("")
  const [viewingReport, setViewingReport] = useState<ReportOrder | null>(null)

  useEffect(() => {
    // Pre-fill from query params (redirect from Stripe or report builder)
    const qAddress = searchParams.get("address")
    if (qAddress) setAddress(decodeURIComponent(qAddress))
    const qRoofType = searchParams.get("roof_type")
    if (qRoofType) setRoofType(decodeURIComponent(qRoofType))
  }, [searchParams])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      setUserId(session.user.id)

      // Handle Stripe success redirect — create the order after payment
      if (searchParams.get("success") === "true") {
        const tier = searchParams.get("tier")
        const paidAddress = searchParams.get("address")
        const paidNotes = searchParams.get("notes") || ""
        const paidRoofType = searchParams.get("roof_type") || "Residential"

        if (tier && paidAddress) {
          const tierObj = TIERS.find((t) => t.id === tier)
          await authFetch("/api/measurement-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contractor_id: session.user.id,
              address: decodeURIComponent(paidAddress),
              roof_type: decodeURIComponent(paidRoofType),
              urgency: "standard",
              notes: decodeURIComponent(paidNotes),
              report_type: tier,
            }),
          })
          setPaymentSuccess(true)
          // Clean URL
          window.history.replaceState({}, "", "/contractor/request-measurement")
        }
      }

      const res = await authFetch(`/api/measurement-requests?contractor_id=${session.user.id}`)
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    init()
  }, [searchParams])

  const handleSubmit = async () => {
    if (!address.trim() || !selectedTier) return
    setSubmitting(true)

    // Redirect to Stripe Checkout
    const res = await authFetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        plan: `report_${selectedTier}`,
        address: address.trim(),
        notes: notes.trim(),
        roof_type: roofType,
      }),
    })

    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await authFetch(`/api/measurement-requests?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      setOrders((prev) => prev.filter((r) => r.id !== id))
      if (viewingReport?.id === id) setViewingReport(null)
    }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Payment Success */}
      {paymentSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
          <CheckCircle className="mx-auto mb-1 h-6 w-6 text-emerald-600" />
          <p className="text-sm font-bold text-emerald-600">Payment successful! Your report has been ordered.</p>
          <p className="mt-1 text-xs text-muted-foreground">We&apos;ll deliver it within 24 hours.</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Professional Roof Reports
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Get accurate, hand-measured reports delivered within 24 hours
        </p>
      </div>

      {/* Pricing Tiers */}
      <div className="grid gap-4 sm:grid-cols-3">
        {TIERS.map((tier) => {
          const Icon = tier.icon
          const isSelected = selectedTier === tier.id
          return (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(isSelected ? null : tier.id)}
              className={`relative flex flex-col rounded-2xl border-2 p-5 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : `${tier.color} hover:ring-1 hover:ring-border`
              }`}
            >
              {tier.badge && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {tier.badge}
                </span>
              )}
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold text-foreground">{tier.name}</span>
              </div>
              <p className="mb-4 text-2xl font-bold text-foreground">
                ${tier.price}<span className="text-sm font-normal text-muted-foreground">/report</span>
              </p>
              <div className="flex flex-col gap-1.5">
                {tier.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-xs">
                    <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-600" />
                    <span className="text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>
              <div className={`mt-4 rounded-xl py-2 text-center text-xs font-bold transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}>
                {isSelected ? "Selected" : "Select"}
              </div>
            </button>
          )
        })}
      </div>

      {/* Order Form — shows when tier selected */}
      {selectedTier && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <DollarSign className="h-4 w-4 text-primary" />
            Order {TIERS.find((t) => t.id === selectedTier)?.name} Report — ${TIERS.find((t) => t.id === selectedTier)?.price}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Property Address *</label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, State ZIP"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Roof Type</label>
              <select
                value={roofType}
                onChange={(e) => setRoofType(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              >
                <option>Residential</option>
                <option>Commercial</option>
                <option>Multi-Family</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Camera className="h-3 w-3" /> Screenshot / Notes
                </span>
              </label>
              <p className="text-[10px] text-muted-foreground mb-1">
                Include a satellite screenshot of the roof for best results
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes / Instructions</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions, attach screenshot links, known roof details..."
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!address.trim() || submitting}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Pay ${TIERS.find((t) => t.id === selectedTier)?.price} & Submit
          </button>

          <p className="mt-2 text-[10px] text-muted-foreground">
            Reports are delivered within 24 hours. You&apos;ll receive an email when ready.
          </p>
        </div>
      )}

      {/* How it works */}
      {!selectedTier && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-foreground">How It Works</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { step: "1", title: "Choose a report", desc: "Select measurements, materials, or the full package" },
              { step: "2", title: "Submit the address", desc: "Include a satellite screenshot for best accuracy" },
              { step: "3", title: "Get your report", desc: "Hand-measured report delivered within 24 hours" },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {s.step}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Need unlimited free measurements? Use our <a href="/contractor/measure" className="text-primary hover:underline">DIY satellite measurement tool</a> — included with your plan.
          </p>
        </div>
      )}

      {/* Order History */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-foreground">Your Orders</h3>
        {orders.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/40 p-8 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No report orders yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {orders.map((r) => {
              const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.requested
              const Icon = sc.icon
              return (
                <div key={r.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${sc.bg}`}>
                      <Icon className={`h-4 w-4 ${sc.color} ${r.status === "in_progress" ? "animate-spin" : ""}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.address}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{r.roof_type}</span>
                        <span>·</span>
                        <span className={`font-semibold ${sc.color}`}>{sc.label}</span>
                        <span>·</span>
                        <span>{timeAgo(r.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.status === "delivered" && r.delivered_data && (
                        <button
                          onClick={() => setViewingReport(viewingReport?.id === r.id ? null : r)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                        >
                          {viewingReport?.id === r.id ? "Hide" : "View Report"}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {viewingReport?.id === r.id && r.delivered_data && (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <h4 className="mb-3 text-xs font-bold text-foreground">Delivered Report</h4>
                      <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                        {typeof r.delivered_data === "string" ? r.delivered_data : JSON.stringify(r.delivered_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
