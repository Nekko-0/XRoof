"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { MapPin, DollarSign, User, Phone, Mail, ArrowRight, CheckCircle } from "lucide-react"
import { useToast } from "@/lib/toast-context"

type EstimateData = {
  roof_sqft: number
  estimate_low: number
  estimate_high: number
  company_name: string
  lat: number | null
  lng: number | null
}

type Branding = {
  company_name: string
  widget_color: string
  logo_url: string
}

export default function WidgetPage() {
  const params = useParams()
  const contractorId = params.contractorId as string
  const toast = useToast()

  const [step, setStep] = useState<"address" | "estimate" | "lead" | "done">("address")
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [estimate, setEstimate] = useState<EstimateData | null>(null)
  const [leadForm, setLeadForm] = useState({ name: "", email: "", phone: "" })
  const [submittingLead, setSubmittingLead] = useState(false)
  const [branding, setBranding] = useState<Branding>({ company_name: "", widget_color: "#059669", logo_url: "" })

  // Fetch contractor branding on load
  useEffect(() => {
    fetch(`/api/widget/branding?contractor_id=${contractorId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.company_name) setBranding(data)
      })
      .catch(() => {})
  }, [contractorId])

  const color = branding.widget_color || "#059669"
  const colorLight = color + "20" // 12% opacity for backgrounds
  const googleKey = typeof window !== "undefined"
    ? (document.querySelector("meta[name='google-maps-key']")?.getAttribute("content") || "")
    : ""

  const handleGetEstimate = async () => {
    if (!address.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/widget/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractor_id: contractorId, address }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        setEstimate(data)
        setStep("estimate")
      }
    } catch {
      toast.error("Failed to get estimate. Please try again.")
    }
    setLoading(false)
  }

  const handleSubmitLead = async () => {
    if (!leadForm.name || (!leadForm.email && !leadForm.phone)) return
    setSubmittingLead(true)
    try {
      await fetch("/api/widget/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractor_id: contractorId,
          address,
          customer_name: leadForm.name,
          customer_email: leadForm.email,
          customer_phone: leadForm.phone,
        }),
      })
      setStep("done")
    } catch {
      toast.error("Failed to submit. Please try again.")
    }
    setSubmittingLead(false)
  }

  const satelliteUrl = estimate?.lat && estimate?.lng
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${estimate.lat},${estimate.lng}&zoom=20&size=400x200&maptype=satellite&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""}`
    : null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {step === "address" && (
          <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-lg">
            <div className="mb-5 text-center">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={branding.company_name} className="mx-auto mb-3 h-12 object-contain" />
              ) : (
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: colorLight }}>
                  <MapPin className="h-6 w-6" style={{ color }} />
                </div>
              )}
              <h2 className="text-lg font-bold text-gray-900">Get Your Roof Estimate</h2>
              <p className="mt-1 text-sm text-gray-500">
                {branding.company_name ? `From ${branding.company_name}` : "Enter your address for an instant estimate"}
              </p>
            </div>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State ZIP"
              className="mb-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": color } as any}
              onKeyDown={(e) => e.key === "Enter" && handleGetEstimate()}
            />
            <button
              onClick={handleGetEstimate}
              disabled={loading || !address.trim()}
              className="w-full rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              {loading ? "Calculating..." : "Get Instant Estimate"}
            </button>
          </div>
        )}

        {step === "estimate" && estimate && (
          <div className="rounded-2xl bg-white border border-gray-200 shadow-lg overflow-hidden">
            {/* Satellite roof image */}
            {satelliteUrl && (
              <div className="relative">
                <img src={satelliteUrl} alt="Satellite view of your roof" className="w-full h-40 object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent h-8" />
              </div>
            )}

            <div className="p-6">
              <div className="mb-5 text-center">
                {branding.logo_url ? (
                  <img src={branding.logo_url} alt={branding.company_name} className="mx-auto mb-3 h-10 object-contain" />
                ) : (
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: colorLight }}>
                    <DollarSign className="h-6 w-6" style={{ color }} />
                  </div>
                )}
                <h2 className="text-lg font-bold text-gray-900">Your Estimated Cost</h2>
                <p className="mt-1 text-xs text-gray-500">{address}</p>
              </div>

              <div className="mb-5 rounded-xl border p-5 text-center" style={{ backgroundColor: colorLight, borderColor: color + "40" }}>
                <p className="text-3xl font-bold text-gray-900">
                  ${estimate.estimate_low.toLocaleString()} – ${estimate.estimate_high.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  ~{estimate.roof_sqft.toLocaleString()} sq ft roof
                </p>
              </div>

              <p className="mb-4 text-center text-xs text-gray-500">
                Want an exact quote? Leave your info and we&apos;ll reach out.
              </p>

              <button
                onClick={() => setStep("lead")}
                className="w-full rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                style={{ backgroundColor: color }}
              >
                Get Exact Quote <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === "lead" && (
          <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-lg">
            <div className="mb-5 text-center">
              {branding.logo_url && (
                <img src={branding.logo_url} alt={branding.company_name} className="mx-auto mb-3 h-10 object-contain" />
              )}
              <h2 className="text-lg font-bold text-gray-900">Get Your Exact Quote</h2>
              <p className="mt-1 text-sm text-gray-500">
                {branding.company_name ? `${branding.company_name} will reach out within 24 hours` : "We'll reach out within 24 hours"}
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": color } as any}
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  placeholder="Email address"
                  className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": color } as any}
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                  placeholder="Phone number"
                  className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": color } as any}
                />
              </div>
            </div>

            <button
              onClick={handleSubmitLead}
              disabled={submittingLead || !leadForm.name || (!leadForm.email && !leadForm.phone)}
              className="mt-4 w-full rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              {submittingLead ? "Submitting..." : "Request Quote"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-lg text-center">
            <CheckCircle className="mx-auto mb-3 h-12 w-12" style={{ color }} />
            <h2 className="text-lg font-bold text-gray-900">Thank You!</h2>
            <p className="mt-2 text-sm text-gray-500">
              {branding.company_name || "Your contractor"} will reach out to you within 24 hours with an exact quote.
            </p>
          </div>
        )}

        <p className="mt-3 text-center text-[10px] text-gray-300">Powered by XRoof</p>
      </div>
    </div>
  )
}
