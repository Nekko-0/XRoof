"use client"

import { darkenColor, lightenColor } from "@/lib/brand-colors"
import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import SignaturePadLib from "signature_pad"
import { CheckCircle, AlertCircle, Clock, PenTool, FileText } from "lucide-react"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { DEFAULT_TERMS, type ContractTerms } from "@/components/contract-terms-defaults"
import { useToast } from "@/lib/toast-context"

type Contract = {
  id: string
  job_id: string
  contractor_name: string
  contractor_company: string | null
  contractor_phone: string | null
  contractor_email: string | null
  contractor_address: string | null
  customer_name: string
  project_address: string
  contract_date: string
  contract_price: number
  deposit_percent: number
  terms: ContractTerms
  contractor_signature_url: string | null
  contractor_signed_at: string | null
  customer_signature_url: string | null
  customer_signed_at: string | null
  status: string
}

type Job = {
  id: string
  customer_name: string
  customer_phone: string
  address: string
}

export default function PublicSigningPage() {
  const params = useParams()
  const token = params.token as string
  const toast = useToast()

  const [contract, setContract] = useState<Contract | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<"expired" | "already_signed" | "invalid" | null>(null)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [sigEmpty, setSigEmpty] = useState(true)
  const [esignConsent, setEsignConsent] = useState(false)
  const [brandColor, setBrandColor] = useState("#059669")
  const [brandLogo, setBrandLogo] = useState("")

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)

  // Fetch contract by token
  useEffect(() => {
    const load = async () => {
      try {
        // Use a dummy jobId — the API checks the token query param
        const res = await fetch(`/api/contracts/_?token=${token}`)
        if (res.status === 410) { setErrorState("expired"); setLoading(false); return }
        if (res.status === 409) { setErrorState("already_signed"); setLoading(false); return }
        if (res.status === 404) { setErrorState("invalid"); setLoading(false); return }

        const data = await res.json()
        if (data.error) { setErrorState("invalid"); setLoading(false); return }

        setContract({
          ...data.contract,
          terms: { ...DEFAULT_TERMS, ...data.contract.terms },
        })
        if (data.job) setJob(data.job)
        if (data.brand_color) setBrandColor(data.brand_color)
        if (data.brand_logo_url) setBrandLogo(data.brand_logo_url)
      } catch {
        setErrorState("invalid")
      }
      setLoading(false)
    }
    load()
  }, [token])

  // Init signature pad
  useEffect(() => {
    if (loading || !contract || errorState || signed) return

    const timer = setTimeout(() => {
      if (!canvasRef.current) return
      const canvas = canvasRef.current
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      const ctx = canvas.getContext("2d")
      if (ctx) ctx.scale(ratio, ratio)

      const pad = new SignaturePadLib(canvas, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(0, 0, 0)",
      })
      pad.addEventListener("endStroke", () => setSigEmpty(pad.isEmpty()))
      padRef.current = pad
      setSigEmpty(true)
    }, 200)

    return () => {
      clearTimeout(timer)
      padRef.current?.off()
    }
  }, [loading, contract, errorState, signed])

  const handleSign = async () => {
    if (!padRef.current || padRef.current.isEmpty()) {
      toast.error("Please sign before submitting"); return
    }

    setSigning(true)
    const signatureDataUrl = padRef.current.toDataURL("image/png")

    try {
      const res = await fetch("/api/contracts/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signature_data_url: signatureDataUrl }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        setSigned(true)
      }
    } catch {
      toast.error("Failed to submit signature. Please try again.")
    }
    setSigning(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading contract...</p>
      </div>
    )
  }

  // Error states
  if (errorState === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <Clock className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">Link Expired</h1>
          <p className="text-sm text-gray-600">
            This signing link has expired. Please contact your contractor to send a new one.
          </p>
        </div>
      </div>
    )
  }

  if (errorState === "already_signed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">Already Signed</h1>
          <p className="text-sm text-gray-600">
            This contract has already been signed. No action needed.
          </p>
        </div>
      </div>
    )
  }

  if (errorState || !contract) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">Invalid Link</h1>
          <p className="text-sm text-gray-600">
            This signing link is invalid or has already been used.
          </p>
        </div>
      </div>
    )
  }

  // Success state
  if (signed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">Contract Signed!</h1>
          <p className="text-sm text-gray-600">
            Thank you, {contract.customer_name}. Your signed contract has been sent to {contract.contractor_name}. You will also receive a copy via email.
          </p>
        </div>
      </div>
    )
  }

  const terms = contract.terms
  const price = contract.contract_price || 0
  const depositPercent = contract.deposit_percent || 50
  const depositAmount = (price * depositPercent) / 100
  const finalAmount = price - depositAmount

  const brandDark = darkenColor(brandColor, 30)

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header bar */}
        <div className="mb-4 rounded-xl p-4 text-center text-white" style={{ backgroundColor: brandDark }}>
          {brandLogo && <img src={brandLogo} alt="Logo" className="mx-auto h-10 mb-2 object-contain" />}
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Review & Sign</p>
          <h1 className="mt-1 text-lg font-bold">{contract.contractor_company || contract.contractor_name}</h1>
          <p className="mt-1 text-xs opacity-70">Contract #{contract.id.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Contract content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

          {/* Parties */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Contractor</h3>
              <div className="space-y-1 text-sm text-gray-900">
                <p>{contract.contractor_name}</p>
                {contract.contractor_company && <p className="text-gray-500">{contract.contractor_company}</p>}
                {contract.contractor_phone && <p className="text-gray-500">{contract.contractor_phone}</p>}
                {contract.contractor_email && <p className="text-gray-500">{contract.contractor_email}</p>}
                {contract.contractor_address && <p className="text-gray-500">{contract.contractor_address}</p>}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</h3>
              <div className="space-y-1 text-sm text-gray-900">
                <p>{contract.customer_name}</p>
                <p className="text-gray-500">{contract.project_address}</p>
                {job?.customer_phone && <p className="text-gray-500">{job.customer_phone}</p>}
                {contract.contract_date && (
                  <p className="text-gray-500">
                    Date: {new Date(contract.contract_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Scope of Work */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Scope of Work</h3>
            <p className="mb-2 text-xs text-gray-500">
              Contractor agrees to provide roofing services at the project address including:
            </p>
            <div className="space-y-2">
              {terms.scope_items.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <input type="checkbox" checked={item.checked} disabled className="mt-1 h-4 w-4 rounded border-gray-300 accent-emerald-700" />
                  <span className="text-sm text-gray-900">{item.label}</span>
                </div>
              ))}
            </div>
            {terms.scope_custom_text && (
              <p className="mt-3 text-sm text-gray-900">{terms.scope_custom_text}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              All work will follow manufacturer installation guidelines and industry standards.
            </p>
          </div>

          {/* Contract Price */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Contract Price</h3>
            <p className="text-lg font-bold text-gray-900">${price.toLocaleString()}</p>
          </div>

          {/* Work Start Date */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Work Start Date</h3>
            <p className="text-sm font-semibold text-gray-900">
              {terms.work_start_date ? new Date(terms.work_start_date + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "To be determined"}
            </p>
          </div>

          {/* Payment Terms */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Payment Terms</h3>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Deposit:</span>
                <span className="text-sm font-semibold">{depositPercent}%</span>
                <span className="text-xs font-semibold text-gray-900">(${depositAmount.toLocaleString()})</span>
              </div>
              <span className="text-xs text-gray-500">|</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Final:</span>
                <span className="text-sm font-semibold">{100 - depositPercent}%</span>
                <span className="text-xs font-semibold text-gray-900">(${finalAmount.toLocaleString()})</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{terms.payment_terms_text}</p>
          </div>

          {/* Legal Clauses */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Terms & Conditions</h3>
            <Accordion type="multiple" defaultValue={["scheduling", "hidden-damage", "subcontractors", "warranty", "governing"]}>
              <AccordionItem value="scheduling">
                <AccordionTrigger className="text-sm">Scheduling & Delays</AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-gray-500 leading-relaxed">{terms.scheduling_text}</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="hidden-damage">
                <AccordionTrigger className="text-sm">Hidden Damage</AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-gray-500 leading-relaxed">{terms.hidden_damage_text}</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="subcontractors">
                <AccordionTrigger className="text-sm">Subcontractors</AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-gray-500 leading-relaxed">{terms.subcontractors_text}</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="warranty">
                <AccordionTrigger className="text-sm">Warranty</AccordionTrigger>
                <AccordionContent>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Workmanship warranty:</span>
                    <span className="text-sm font-semibold">{terms.warranty_years}</span>
                    <span className="text-xs text-gray-500">years</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{terms.warranty_text}</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="governing">
                <AccordionTrigger className="text-sm">Governing Law</AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This agreement shall be governed by the laws of the State of{" "}
                    <strong>{terms.governing_state}</strong>.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Contract Summary / PDF Preview */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Contract Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-gray-500">Contractor</p>
                <p className="font-medium text-gray-900">{contract.contractor_company || contract.contractor_name}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Customer</p>
                <p className="font-medium text-gray-900">{contract.customer_name}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Project Address</p>
                <p className="font-medium text-gray-900">{contract.project_address}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Contract Price</p>
                <p className="font-medium text-gray-900">${contract.contract_price.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Deposit</p>
                <p className="font-medium text-gray-900">{contract.deposit_percent}% (${Math.round(contract.contract_price * contract.deposit_percent / 100).toLocaleString()})</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Date</p>
                <p className="font-medium text-gray-900">{new Date(contract.contract_date).toLocaleDateString()}</p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
            >
              <FileText className="h-3.5 w-3.5" />
              Print / Save as PDF
            </button>
          </div>

          {/* Agreement */}
          <div className="mb-6 rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-900">
              By signing below, both parties agree to all terms and conditions outlined in this contract.
              This contract is legally binding upon signature by both the Contractor and Customer.
            </p>
          </div>

          {/* Contractor Signature (already signed) */}
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Contractor Signature
            </h4>
            {contract.contractor_signature_url ? (
              <div>
                <img src={contract.contractor_signature_url} alt="Contractor signature" className="h-24 w-full rounded-lg border border-gray-200 bg-white object-contain" />
                <p className="mt-1 text-[10px] text-gray-500">
                  Signed {contract.contractor_signed_at && new Date(contract.contractor_signed_at).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            )}
          </div>

          {/* Customer Signature Pad */}
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Your Signature
            </h4>
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-white"
              style={{ height: 140, touchAction: "none" }}
            />
            <div className="mt-1 flex items-center justify-between">
              <button
                onClick={() => { padRef.current?.clear(); setSigEmpty(true) }}
                className="text-[11px] text-gray-500 hover:text-gray-600"
              >
                Clear signature
              </button>
              <p className="text-[10px] text-gray-500">Draw your signature above</p>
            </div>
          </div>

          {/* E-Sign Consent */}
          <label className="mb-4 flex items-start gap-2.5 cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-3">
            <input
              type="checkbox"
              checked={esignConsent}
              onChange={(e) => setEsignConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-emerald-700"
            />
            <span className="text-[11px] leading-relaxed text-gray-600">
              I agree to sign this contract electronically. I understand that my electronic signature has the same legal effect as a handwritten signature under the Electronic Signatures in Global and National Commerce Act (ESIGN Act) and the Uniform Electronic Transactions Act (UETA).
            </span>
          </label>

          {/* Sign button */}
          <button
            onClick={handleSign}
            disabled={signing || sigEmpty || !esignConsent}
            className="w-full rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: brandDark }}
          >
            <PenTool className="mr-2 inline h-4 w-4" />
            {signing ? "Submitting..." : "Sign Contract"}
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] text-gray-500">
          Powered by XRoof
        </p>
      </div>
    </div>
  )
}
