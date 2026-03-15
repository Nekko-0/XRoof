"use client"

import { darkenColor, lightenColor, colorWithOpacity } from "@/lib/brand-colors"
import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { CheckCircle, CreditCard, Lock, Printer, MapPin, Phone, Calendar, Hash, Banknote, Building2, Wallet, DollarSign, Mail } from "lucide-react"
import { useToast } from "@/lib/toast-context"

type LineItem = { description: string; amount: number }

type Milestone = {
  label: string
  percent: number
  amount: number
  paid: boolean
  due: boolean
}

type Invoice = {
  id: string
  invoice_number: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  address: string | null
  job_type: string | null
  amount: number
  discount: number
  notes: string | null
  payment_methods: string[]
  line_items: LineItem[]
  hidden_fields: string[]
  scope: string | null
  extra_photo_urls: string[]
  logo_url: string | null
  status: string
  created_at: string
  company_name: string
  photo_urls: string[]
  description: string
  milestones: Milestone[]
  brand_color: string
  brand_logo_url: string | null
  stripe_connected: boolean
  contractor_email: string
  contractor_phone: string
}

export default function PayInvoicePage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [justPaid, setJustPaid] = useState(false)

  useEffect(() => {
    const fetchInvoice = async () => {
      const isPreview = searchParams.get("preview") === "true"
      const res = await fetch(`/api/invoices?id=${id}${isPreview ? "&preview=true" : ""}`)
      if (res.ok) {
        const data = await res.json()
        setInvoice(data)

        // Stripe redirects here with ?success=true after payment.
        // The Stripe webhook handles the actual status update in the database.
        // We just show a success message to the customer.
        if (searchParams.get("success") === "true") {
          setJustPaid(true)
        }
      }
      setLoading(false)
    }
    fetchInvoice()
  }, [id, searchParams])

  const handlePay = async (milestoneIndex?: number) => {
    setPaying(true)
    const body = milestoneIndex !== undefined ? JSON.stringify({ milestone_index: milestoneIndex }) : undefined
    const res = await fetch(`/api/invoices/${id}/checkout`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body,
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      toast.error(data.error || "Unable to start payment")
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <p className="text-sm text-gray-500">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Invoice not found</p>
          <p className="mt-1 text-sm text-gray-400">This invoice may have been removed or the link is incorrect.</p>
        </div>
      </div>
    )
  }

  const milestones = invoice.milestones || []
  const hasMilestones = milestones.length > 0
  const paidMilestones = milestones.filter((m) => m.paid)
  const currentMilestone = milestones.find((m) => m.due && !m.paid)
  const milestonesPaidTotal = paidMilestones.reduce((sum, m) => sum + (m.amount || 0), 0)
  const isPaid = invoice.status === "paid"
  const lineItems = invoice.line_items || []
  const lineItemsCents = lineItems.reduce((sum, li) => sum + (li.amount || 0), 0)
  const subtotalCents = invoice.amount + lineItemsCents
  const discountCents = invoice.discount || 0
  const totalCents = subtotalCents - discountCents
  const subtotal = (subtotalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })
  const baseAmount = (invoice.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })
  const discountAmount = (discountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })
  const amount = (totalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })
  const hasDiscount = discountCents > 0
  const hasLineItems = lineItems.length > 0
  const paymentMethods = invoice.payment_methods || ["card"]
  const hasCard = paymentMethods.includes("card") && invoice.stripe_connected !== false
  const cardUnavailable = paymentMethods.includes("card") && invoice.stripe_connected === false
  const altMethods = paymentMethods.filter((m) => m !== "card")
  const hidden = new Set(invoice.hidden_fields || [])
  const date = new Date(invoice.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })
  const initials = (invoice.company_name || "C").charAt(0).toUpperCase()
  const brandColor = invoice.brand_color || "#059669"
  const brandDark = darkenColor(brandColor, 30)

  const methodLabels: Record<string, { label: string; icon: typeof Banknote; description: string }> = {
    check: { label: "Check", icon: Banknote, description: `Make check payable to "${invoice.company_name || "Contractor"}"` },
    cash: { label: "Cash", icon: DollarSign, description: "Cash payment accepted — contact contractor to arrange" },
    zelle: { label: "Zelle", icon: Wallet, description: "Send via Zelle — contact contractor for Zelle info" },
    venmo: { label: "Venmo", icon: Wallet, description: "Send via Venmo — contact contractor for Venmo info" },
    cashapp: { label: "Cash App", icon: Wallet, description: "Send via Cash App — contact contractor for Cash App info" },
    ach: { label: "Bank Transfer (ACH)", icon: Building2, description: "Direct bank transfer — contact contractor for routing details" },
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 print:bg-white">
      {/* Green accent bar */}
      <div className="h-1 print:hidden" style={{ backgroundColor: brandColor }} />

      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Success banner */}
        {justPaid && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl px-6 py-4 shadow-sm" style={{ backgroundColor: lightenColor(brandColor, 90), border: `1px solid ${colorWithOpacity(brandColor, 0.3)}` }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: lightenColor(brandColor, 80) }}>
              <CheckCircle className="h-6 w-6" style={{ color: brandColor }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: darkenColor(brandColor, 20) }}>Payment successful!</p>
              <p className="text-xs" style={{ color: brandColor }}>Thank you for your payment. A receipt has been sent to your email.</p>
            </div>
          </div>
        )}

        {/* Invoice card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden print:shadow-none print:border-none">

          {/* Header */}
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 py-6 sm:px-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {invoice.logo_url ? (
                  <img src={invoice.logo_url} alt="Logo" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-lg font-bold text-white backdrop-blur-sm">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-lg font-bold text-white">{invoice.company_name || "Contractor"}</p>
                  <p className="text-xs text-gray-400">Professional Roofing Services</p>
                </div>
              </div>
              {isPaid ? (
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: colorWithOpacity(brandColor, 0.2), color: brandColor, boxShadow: `0 0 0 1px ${colorWithOpacity(brandColor, 0.3)}` }}>
                  PAID
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400 ring-1 ring-amber-500/30">
                  UNPAID
                </span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                  <Hash className="h-3 w-3" />
                  Invoice
                </div>
                <p className="mt-0.5 text-sm font-semibold text-white">{invoice.invoice_number}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                  <Calendar className="h-3 w-3" />
                  Date
                </div>
                <p className="mt-0.5 text-sm font-semibold text-white">{date}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Amount Due</div>
                <p className="mt-0.5 text-2xl font-bold text-white">${amount}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 sm:px-8">

            {/* Bill To */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Bill To</p>
                {!hidden.has("customer_name") && (
                  <p className="text-base font-bold text-gray-900">{invoice.customer_name}</p>
                )}
                {!hidden.has("address") && invoice.address && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    {invoice.address}
                  </div>
                )}
                {!hidden.has("phone") && invoice.customer_phone && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    {invoice.customer_phone}
                  </div>
                )}
                {!hidden.has("email") && invoice.customer_email && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    {invoice.customer_email}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">From</p>
                <p className="text-base font-bold text-gray-900">{invoice.company_name || "Contractor"}</p>
                <p className="mt-1 text-sm text-gray-500">Professional Roofing</p>
              </div>
            </div>

            {/* Job Photos */}
            {(() => {
              const jobPhotos = (!hidden.has("photos") && invoice.photo_urls) ? invoice.photo_urls.slice(0, 4) : []
              const extraPhotos = invoice.extra_photo_urls || []
              const allPhotos = [...jobPhotos, ...extraPhotos]
              if (allPhotos.length === 0) return null
              return (
                <div className="mt-6">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Job Photos</p>
                  <div className="flex gap-2 overflow-x-auto">
                    {allPhotos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Photo ${i + 1}`}
                          className="h-24 w-24 rounded-xl object-cover border border-gray-200 hover:opacity-80 transition-opacity sm:h-28 sm:w-28" />
                      </a>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Scope of Work */}
            {(invoice.scope || invoice.description) && (
              <div className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Scope of Work</p>
                <p className="text-sm leading-relaxed text-gray-600 rounded-xl bg-gray-50 px-4 py-3">{invoice.scope || invoice.description}</p>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Notes</p>
                <p className="text-sm leading-relaxed text-gray-600 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">{invoice.notes}</p>
              </div>
            )}

            {/* Line Items */}
            <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Amount</span>
              </div>
              <div className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">{invoice.job_type || "Roofing Service"}</p>
                  {!hidden.has("address") && invoice.address && <p className="text-xs text-gray-400 mt-0.5">{invoice.address}</p>}
                </div>
                <span className="text-sm font-bold text-gray-900">${baseAmount}</span>
              </div>
              {hasLineItems && lineItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                  <p className="text-sm font-medium text-gray-800">{item.description}</p>
                  <span className="text-sm font-bold text-gray-900">${(item.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              {(hasLineItems || hasDiscount) && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium text-gray-500">Subtotal</p>
                  <span className="text-sm font-bold text-gray-700">${subtotal}</span>
                </div>
              )}
              {hasDiscount && (
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3" style={{ backgroundColor: colorWithOpacity(brandColor, 0.05) }}>
                  <p className="text-sm font-medium" style={{ color: darkenColor(brandColor, 10) }}>Discount</p>
                  <span className="text-sm font-bold" style={{ color: brandColor }}>-${discountAmount}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="mt-4 rounded-xl bg-gray-900 px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-300">Total Due</span>
                <span className="text-2xl font-bold text-white">${amount}</span>
              </div>
            </div>

            {/* Milestone Payment Schedule */}
            {hasMilestones && (
              <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Payment Schedule</p>
                <div className="flex flex-col gap-2">
                  {milestones.map((m, i) => (
                    <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${m.paid ? "" : m.due ? "bg-white shadow-sm" : "bg-white border border-gray-100"}`} style={m.paid ? { backgroundColor: lightenColor(brandColor, 90), border: `1px solid ${colorWithOpacity(brandColor, 0.3)}` } : m.due ? { border: `1px solid ${colorWithOpacity(brandColor, 0.4)}` } : undefined}>
                      <div className="flex items-center gap-2">
                        {m.paid ? (
                          <CheckCircle className="h-4 w-4" style={{ color: brandColor }} />
                        ) : m.due ? (
                          <div className="h-4 w-4 rounded-full" style={{ borderWidth: 2, borderStyle: "solid", borderColor: brandColor, backgroundColor: lightenColor(brandColor, 80) }} />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                        )}
                        <span className="text-sm font-medium" style={m.paid ? { color: darkenColor(brandColor, 10) } : { color: "#374151" }}>
                          {m.label} ({m.percent}%)
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${m.paid ? "line-through" : ""}`} style={m.paid ? { color: brandColor } : m.due ? { color: darkenColor(brandColor, 10) } : { color: "#9ca3af" }}>
                        ${(m.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
                {milestonesPaidTotal > 0 && (
                  <p className="mt-2 text-right text-xs font-semibold" style={{ color: brandColor }}>
                    ${(milestonesPaidTotal / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} of ${amount} paid
                  </p>
                )}
              </div>
            )}

            {/* Pay / Paid */}
            <div className="mt-6">
              {isPaid ? (
                <div className="flex items-center justify-center gap-3 rounded-xl py-4" style={{ backgroundColor: lightenColor(brandColor, 90), border: `1px solid ${colorWithOpacity(brandColor, 0.3)}` }}>
                  <CheckCircle className="h-6 w-6" style={{ color: brandColor }} />
                  <div>
                    <span className="text-base font-bold" style={{ color: darkenColor(brandColor, 10) }}>Paid in Full</span>
                    {invoice.status === "paid" && (
                      <p className="text-xs" style={{ color: brandColor }}>Thank you for your payment</p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {hasCard && (
                    hasMilestones && currentMilestone ? (
                      <button
                        onClick={() => handlePay(milestones.indexOf(currentMilestone))}
                        disabled={paying}
                        className="flex w-full items-center justify-center gap-2.5 rounded-xl py-4 text-base font-bold text-white shadow-lg transition-all disabled:opacity-50 print:hidden"
                        style={{ backgroundColor: brandDark }}
                      >
                        <CreditCard className="h-5 w-5" />
                        {paying ? "Redirecting to secure checkout..." : `Pay $${(currentMilestone.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} — ${currentMilestone.label}`}
                      </button>
                    ) : !hasMilestones ? (
                      <button
                        onClick={() => handlePay()}
                        disabled={paying}
                        className="flex w-full items-center justify-center gap-2.5 rounded-xl py-4 text-base font-bold text-white shadow-lg transition-all disabled:opacity-50 print:hidden"
                        style={{ backgroundColor: brandDark }}
                      >
                        <CreditCard className="h-5 w-5" />
                        {paying ? "Redirecting to secure checkout..." : `Pay $${amount} with Card`}
                      </button>
                    ) : null
                  )}

                  {cardUnavailable && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 print:hidden">
                      <CreditCard className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-600">Card payment unavailable</p>
                        <p className="text-xs text-gray-400">Please use one of the payment methods below, or contact your contractor.</p>
                      </div>
                    </div>
                  )}

                  {/* Alternative payment methods */}
                  {altMethods.length > 0 && (
                    <div className={`${hasCard || cardUnavailable ? "mt-4" : ""}`}>
                      {(hasCard || cardUnavailable) && altMethods.length > 0 && (
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-px flex-1 bg-gray-200" />
                          <span className="text-xs font-medium text-gray-400">or pay with</span>
                          <div className="h-px flex-1 bg-gray-200" />
                        </div>
                      )}
                      <div className="space-y-2">
                        {altMethods.map((method) => {
                          const info = methodLabels[method]
                          if (!info) return null
                          const Icon = info.icon
                          return (
                            <div key={method} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                              <Icon className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{info.label}</p>
                                <p className="text-xs text-gray-500">{info.description}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Contact Contractor */}
                  {(invoice.contractor_email || invoice.contractor_phone) && (
                    <div className="mt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs font-medium text-gray-400">or contact contractor directly</span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>
                      <div className="flex gap-2">
                        {invoice.contractor_email && (
                          <a
                            href={`mailto:${invoice.contractor_email}`}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors hover:bg-opacity-10"
                            style={{ borderColor: brandColor, color: brandColor }}
                          >
                            <Mail className="h-4 w-4" />
                            Email
                          </a>
                        )}
                        {invoice.contractor_phone && (
                          <a
                            href={`tel:${invoice.contractor_phone}`}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors hover:bg-opacity-10"
                            style={{ borderColor: brandColor, color: brandColor }}
                          >
                            <Phone className="h-4 w-4" />
                            Call
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Trust indicator */}
            {!isPaid && hasCard && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 print:hidden">
                <Lock className="h-3 w-3" />
                Secure payment powered by Stripe
              </div>
            )}

            {/* Print button */}
            <div className="mt-4 flex justify-center print:hidden">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600 hover:bg-gray-100"
              >
                <Printer className="h-3.5 w-3.5" />
                Print / Download PDF
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 text-center sm:px-8">
            <p className="text-[10px] text-gray-400">
              Powered by <span className="font-semibold">XRoof</span> — Professional Roofing Software
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
