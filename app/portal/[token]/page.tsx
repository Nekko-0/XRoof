"use client"

import { colorWithOpacity } from "@/lib/brand-colors"
import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import {
  MapPin, Phone, Mail, Calendar, DollarSign, FileText,
  CheckCircle, Clock, Wrench, Camera, Star, Building2,
  AlertCircle, ArrowRight, MessageSquare, Send,
  FileSignature, CreditCard, Activity, ExternalLink, Eye,
  ArrowLeftRight,
} from "lucide-react"
import { BeforeAfterSlider } from "@/components/before-after-slider"

type PortalMessage = {
  id: string
  job_id: string
  sender: "homeowner" | "contractor"
  message: string
  created_at: string
}

type Invoice = {
  id: string
  invoice_number?: string
  amount: number
  status: string
  created_at: string
}

type ContractInfo = {
  id: string
  contract_price: number | null
  deposit_percent: number | null
  status: string
  signing_token: string | null
  signing_token_expires_at: string | null
  customer_signed_at: string | null
  contractor_signed_at: string | null
  created_at: string
}

type EstimateInfo = {
  id: string
  price_quote: number | null
  scope_of_work: string
  viewing_token: string | null
  viewing_token_expires_at: string | null
  estimate_accepted: boolean
  estimate_accepted_at: string | null
  created_at: string
  report_completed: boolean
}

type DocEvent = {
  id: string
  document_type: string
  event_type: string
  created_at: string
}

type PortalData = {
  job: {
    id: string
    customer_name: string
    customer_phone: string
    address: string
    zip_code: string
    job_type: string
    status: string
    budget: number | null
    created_at: string
    contractor_id: string
    scheduled_date: string | null
  }
  contractor: {
    username: string
    company_name: string
    phone: string
    email: string
    google_review_url: string
    widget_color: string
    logo_url: string
  }
  report: {
    id: string
    price_quote: number | null
    scope_of_work: string
    photo_urls: string[]
    photo_captions: string[]
    photo_visible: boolean[]
    pricing_tiers: { name: string; description: string; price: number | null }[] | null
    deposit_percent: number | null
    created_at: string
  } | null
  photos: {
    id: string
    url: string
    category: string
    caption: string
    created_at: string
  }[]
  contracts: ContractInfo[]
  estimates: EstimateInfo[]
  events: DocEvent[]
}

const STATUS_STEPS = [
  { status: "New", label: "Lead Created" },
  { status: "Accepted", label: "Job Accepted" },
  { status: "Estimate Sent", label: "Estimate Sent" },
  { status: "Scheduled", label: "Scheduled" },
  { status: "In Progress", label: "In Progress" },
  { status: "Completed", label: "Completed" },
]

type TabId = "overview" | "documents" | "activity" | "messages"

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function eventLabel(ev: DocEvent) {
  const labels: Record<string, Record<string, string>> = {
    report: { sent: "Estimate sent to you", interested: "Estimate accepted", opened: "Estimate viewed" },
    contract: { sent: "Contract sent for signing", signed: "Contract signed", opened: "Contract viewed" },
    invoice: { sent: "Invoice sent", paid: "Payment received", opened: "Invoice viewed" },
  }
  return labels[ev.document_type]?.[ev.event_type] || `${ev.document_type} — ${ev.event_type}`
}

function eventIcon(ev: DocEvent, brandColor: string) {
  const cls = "h-4 w-4"
  switch (ev.event_type) {
    case "sent": return <Send className={cls} style={{ color: brandColor }} />
    case "signed": return <FileSignature className={cls} style={{ color: "#10b981" }} />
    case "interested": return <CheckCircle className={cls} style={{ color: "#10b981" }} />
    case "paid": return <DollarSign className={cls} style={{ color: "#10b981" }} />
    case "opened": return <Eye className={cls} style={{ color: "#6b7280" }} />
    default: return <Activity className={cls} style={{ color: brandColor }} />
  }
}

export default function HomeownerPortal() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>("overview")

  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])

  // Booking state
  const [showBooking, setShowBooking] = useState(false)
  const [bookingDate, setBookingDate] = useState("")
  const [bookingSlots, setBookingSlots] = useState<string[]>([])
  const [bookingDuration, setBookingDuration] = useState(60)
  const [selectedSlot, setSelectedSlot] = useState("")
  const [bookingPhone, setBookingPhone] = useState("")
  const [bookingNotes, setBookingNotes] = useState("")
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)

  const fetchMessages = async (jobId: string) => {
    try {
      const res = await fetch(`/api/portal/messages?job_id=${jobId}`)
      if (res.ok) { const json = await res.json(); setMessages(json.messages || []) }
    } catch {}
  }

  const fetchInvoices = async (jobId: string) => {
    try {
      const res = await fetch(`/api/portal/invoices?job_id=${jobId}`)
      if (res.ok) { const json = await res.json(); setInvoices(json.invoices || []) }
    } catch {}
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !data?.job.id || sendingMessage) return
    setSendingMessage(true)
    try {
      const res = await fetch("/api/portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: data.job.id, sender: "homeowner", message: newMessage.trim() }),
      })
      if (res.ok) { setNewMessage(""); await fetchMessages(data.job.id) }
    } catch {}
    setSendingMessage(false)
  }

  const fetchSlots = async (contractorId: string, date: string) => {
    setSlotsLoading(true)
    setBookingSlots([])
    setSelectedSlot("")
    try {
      const res = await fetch(`/api/bookings/availability?contractor_id=${contractorId}&date=${date}`)
      if (res.ok) {
        const json = await res.json()
        setBookingSlots(json.slots || [])
        setBookingDuration(json.duration || 60)
      }
    } catch {}
    setSlotsLoading(false)
  }

  const submitBooking = async () => {
    if (!data || !bookingDate || !selectedSlot || bookingLoading) return
    setBookingLoading(true)
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractor_id: data.job.contractor_id,
          job_id: data.job.id,
          date: bookingDate,
          time: selectedSlot,
          customer_name: data.job.customer_name,
          customer_email: "",
          customer_phone: bookingPhone || data.job.customer_phone || "",
          notes: bookingNotes,
        }),
      })
      if (res.ok) {
        setBookingConfirmed(true)
        setShowBooking(false)
      }
    } catch {}
    setBookingLoading(false)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/portal?token=${token}`)
        if (!res.ok) { setError(true); setLoading(false); return }
        const json = await res.json()
        if (json.error) { setError(true); setLoading(false); return }
        setData(json)
        fetchMessages(json.job.id)
        fetchInvoices(json.job.id)
      } catch { setError(true) }
      setLoading(false)
    }
    load()
  }, [token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-400" />
          <h1 className="text-xl font-bold text-white">Project Not Found</h1>
          <p className="mt-2 text-sm text-gray-400">This project link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  const { job, contractor, report, photos, contracts, estimates, events } = data
  const companyName = contractor.company_name || contractor.username || "Your Contractor"
  const brandColor = contractor.widget_color || "#3b82f6"

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === job.status)
  const progressPercent = currentStepIndex >= 0 ? ((currentStepIndex + 1) / STATUS_STEPS.length) * 100 : 0

  const unpaidInvoices = invoices.filter((i) => i.status !== "paid")

  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <Wrench className="h-4 w-4" /> },
    { id: "documents", label: "Documents", icon: <FileText className="h-4 w-4" />, badge: unpaidInvoices.length || undefined },
    { id: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
    { id: "messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            {contractor.logo_url && <img src={contractor.logo_url} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />}
            <div>
              <h1 className="text-lg font-bold">{companyName}</h1>
              <p className="text-xs text-gray-400">Project Portal</p>
            </div>
          </div>
          {contractor.phone && (
            <a href={`tel:${contractor.phone}`} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors" style={{ backgroundColor: brandColor }}>
              <Phone className="h-4 w-4" /> Call Us
            </a>
          )}
        </div>
        {/* Tabs */}
        <div className="mx-auto max-w-3xl px-5">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.id ? "text-white" : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
                style={activeTab === tab.id ? { borderColor: brandColor } : undefined}
              >
                {tab.icon} {tab.label}
                {tab.badge ? <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{tab.badge}</span> : null}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6 flex flex-col gap-5">
        <div>
          <h2 className="text-2xl font-bold">Hi {job.customer_name.split(" ")[0]},</h2>
          <p className="mt-1 text-sm text-gray-400">Here&apos;s the latest on your roofing project</p>
        </div>

        {/* ===== OVERVIEW ===== */}
        {activeTab === "overview" && (
          <>
            {/* Status */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
                <Wrench className="h-4 w-4" style={{ color: brandColor }} /> Project Status
              </h3>
              <div className="mb-4">
                <div className="h-2 w-full rounded-full bg-gray-800">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${progressPercent}%`, backgroundColor: brandColor }} />
                </div>
              </div>
              <div className="flex justify-between">
                {STATUS_STEPS.map((step, i) => {
                  const done = i <= currentStepIndex
                  const current = i === currentStepIndex
                  return (
                    <div key={step.status} className="flex flex-col items-center gap-1">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${done ? "" : "border-gray-700 bg-gray-800"}`} style={done ? { borderColor: brandColor, backgroundColor: colorWithOpacity(brandColor, 0.2) } : undefined}>
                        {done ? <CheckCircle className="h-4 w-4" style={{ color: brandColor }} /> : <span className="text-[10px] text-gray-500">{i + 1}</span>}
                      </div>
                      <span className={`text-[10px] font-medium text-center leading-tight ${current ? "text-white" : done ? "" : "text-gray-500"}`} style={done && !current ? { color: brandColor } : undefined}>{step.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4" style={{ color: brandColor }} /> Project Details</h3>
                <div className="flex flex-col gap-2.5">
                  <div><p className="text-[10px] font-medium text-gray-500 uppercase">Address</p><p className="text-sm text-white">{job.address}</p></div>
                  <div><p className="text-[10px] font-medium text-gray-500 uppercase">Job Type</p><p className="text-sm text-white">{job.job_type || "Roofing"}</p></div>
                  {job.scheduled_date && (
                    <div><p className="text-[10px] font-medium text-gray-500 uppercase">Scheduled</p><p className="text-sm text-white flex items-center gap-1"><Calendar className="h-3 w-3" style={{ color: brandColor }} />{new Date(job.scheduled_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p></div>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Building2 className="h-4 w-4" style={{ color: brandColor }} /> Your Contractor</h3>
                <div className="flex flex-col gap-2.5">
                  <div><p className="text-[10px] font-medium text-gray-500 uppercase">Company</p><p className="text-sm text-white">{companyName}</p></div>
                  {contractor.phone && <div><p className="text-[10px] font-medium text-gray-500 uppercase">Phone</p><a href={`tel:${contractor.phone}`} className="text-sm hover:underline flex items-center gap-1" style={{ color: brandColor }}><Phone className="h-3 w-3" /> {contractor.phone}</a></div>}
                  {contractor.email && <div><p className="text-[10px] font-medium text-gray-500 uppercase">Email</p><a href={`mailto:${contractor.email}`} className="text-sm hover:underline flex items-center gap-1" style={{ color: brandColor }}><Mail className="h-3 w-3" /> {contractor.email}</a></div>}
                </div>
              </div>
            </div>

            {/* Estimate */}
            {report && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><DollarSign className="h-4 w-4" style={{ color: brandColor }} /> Your Estimate</h3>
                {report.pricing_tiers && report.pricing_tiers.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {report.pricing_tiers.map((tier, i) => (
                      <div key={i} className={`rounded-xl border p-4 text-center ${i === 1 ? "ring-1" : "border-gray-700 bg-gray-800/50"}`} style={i === 1 ? { borderColor: brandColor, backgroundColor: colorWithOpacity(brandColor, 0.1) } : undefined}>
                        {i === 1 && <p className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: brandColor }}>Most Popular</p>}
                        <p className="text-sm font-bold text-white">{tier.name}</p>
                        <p className="mt-1 text-2xl font-bold" style={{ color: brandColor }}>{tier.price ? `$${tier.price.toLocaleString()}` : "TBD"}</p>
                        {tier.description && <p className="mt-1 text-[11px] text-gray-400">{tier.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : report.price_quote ? (
                  <div className="text-center py-2">
                    <p className="text-3xl font-bold" style={{ color: brandColor }}>${report.price_quote.toLocaleString()}</p>
                    {report.deposit_percent && <p className="mt-1 text-xs text-gray-400">Deposit: ${Math.round(report.price_quote * report.deposit_percent / 100).toLocaleString()} ({report.deposit_percent}%)</p>}
                  </div>
                ) : null}
                {report.scope_of_work && (
                  <div className="mt-4 rounded-xl bg-gray-800/50 p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase text-gray-500">Scope of Work</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{report.scope_of_work}</p>
                  </div>
                )}
              </div>
            )}

            {/* Before/After Comparison */}
            {(() => {
              const beforePhotos = photos.filter((p) => p.category === "before")
              const afterPhotos = photos.filter((p) => p.category === "after")
              const pairs = Math.min(beforePhotos.length, afterPhotos.length)
              if (pairs === 0) return null
              return (
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                    <ArrowLeftRight className="h-4 w-4" style={{ color: brandColor }} /> Before &amp; After
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">Drag the slider to compare.</p>
                  <div className="space-y-3">
                    {beforePhotos.slice(0, pairs).map((bp, i) => (
                      <BeforeAfterSlider
                        key={bp.id}
                        beforeUrl={bp.url}
                        afterUrl={afterPhotos[i].url}
                        beforeLabel={bp.caption || "Before"}
                        afterLabel={afterPhotos[i].caption || "After"}
                        height={260}
                        brandColor={brandColor}
                      />
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Photos */}
            {photos.length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Camera className="h-4 w-4" style={{ color: brandColor }} /> Project Photos ({photos.length})</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {photos.map((p) => (
                    <div key={p.id} className="group relative overflow-hidden rounded-xl">
                      <img src={p.url} alt={p.caption || "Project photo"} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
                      {p.caption && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2"><p className="text-[10px] text-white">{p.caption}</p></div>}
                      <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-semibold text-white capitalize">{p.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Required Banner */}
            {(unpaidInvoices.length > 0 || (contracts || []).some((c) => c.status !== "signed" && c.signing_token)) && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                <h3 className="mb-3 text-sm font-bold text-amber-400">Action Required</h3>
                <div className="flex flex-col gap-2">
                  {unpaidInvoices.map((inv) => (
                    <a key={inv.id} href={`/pay/${inv.id}`} className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3 hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-4 w-4 text-amber-400" />
                        <div><p className="text-sm font-semibold text-white">Pay Invoice — ${inv.amount.toLocaleString()}</p><p className="text-[10px] text-gray-400">{inv.invoice_number || formatDate(inv.created_at)}</p></div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-500" />
                    </a>
                  ))}
                  {(contracts || []).filter((c) => c.status !== "signed" && c.signing_token).map((c) => (
                    <a key={c.id} href={`/sign/${c.signing_token}`} className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3 hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileSignature className="h-4 w-4 text-amber-400" />
                        <div><p className="text-sm font-semibold text-white">Sign Contract</p><p className="text-[10px] text-gray-400">{c.contract_price ? `$${c.contract_price.toLocaleString()}` : ""}</p></div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule Appointment */}
            {!job.scheduled_date && !bookingConfirmed && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <Calendar className="h-4 w-4" style={{ color: brandColor }} /> Schedule a Site Visit
                </h3>
                <p className="text-xs text-gray-400 mb-4">Pick a date and time that works for you.</p>
                {!showBooking ? (
                  <button
                    onClick={() => setShowBooking(true)}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors"
                    style={{ backgroundColor: brandColor }}
                  >
                    <Calendar className="h-4 w-4" /> Book Appointment
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase">Select Date</label>
                      <input
                        type="date"
                        value={bookingDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => {
                          setBookingDate(e.target.value)
                          if (e.target.value) fetchSlots(job.contractor_id, e.target.value)
                        }}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {bookingDate && (
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase">
                          Available Times {bookingDuration && `(${bookingDuration} min)`}
                        </label>
                        {slotsLoading ? (
                          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                            Loading availability...
                          </div>
                        ) : bookingSlots.length === 0 ? (
                          <p className="text-xs text-gray-500 py-2">No available slots on this date. Try another day.</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {bookingSlots.map((slot) => {
                              const [h, m] = slot.split(":").map(Number)
                              const ampm = h >= 12 ? "PM" : "AM"
                              const h12 = h % 12 || 12
                              const label = `${h12}:${String(m).padStart(2, "0")} ${ampm}`
                              return (
                                <button
                                  key={slot}
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                                    selectedSlot === slot
                                      ? "text-white"
                                      : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
                                  }`}
                                  style={selectedSlot === slot ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
                                >
                                  {label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedSlot && (
                      <>
                        <div>
                          <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase">Phone (optional)</label>
                          <input
                            type="tel"
                            value={bookingPhone}
                            onChange={(e) => setBookingPhone(e.target.value)}
                            placeholder="For appointment reminders"
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase">Notes (optional)</label>
                          <textarea
                            value={bookingNotes}
                            onChange={(e) => setBookingNotes(e.target.value)}
                            rows={2}
                            placeholder="Anything we should know before the visit?"
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={submitBooking}
                            disabled={bookingLoading}
                            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
                            style={{ backgroundColor: brandColor }}
                          >
                            {bookingLoading ? "Booking..." : "Confirm Appointment"}
                          </button>
                          <button
                            onClick={() => { setShowBooking(false); setBookingDate(""); setSelectedSlot("") }}
                            className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {bookingConfirmed && (
              <div className="rounded-2xl border p-5" style={{ borderColor: brandColor, backgroundColor: colorWithOpacity(brandColor, 0.05) }}>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6" style={{ color: brandColor }} />
                  <div>
                    <h3 className="text-sm font-bold text-white">Appointment Confirmed!</h3>
                    <p className="text-xs text-gray-400">You&apos;ll receive a confirmation with the details shortly.</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== DOCUMENTS ===== */}
        {activeTab === "documents" && (
          <>
            {(estimates || []).length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4" style={{ color: brandColor }} /> Estimates ({estimates.length})</h3>
                <div className="flex flex-col gap-2">
                  {estimates.map((est) => (
                    <div key={est.id} className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{est.price_quote ? `$${est.price_quote.toLocaleString()}` : "Estimate"}</p>
                        <p className="text-[10px] text-gray-500">{formatDate(est.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${est.estimate_accepted ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>{est.estimate_accepted ? "Accepted" : "Pending"}</span>
                        {est.viewing_token && <a href={`/estimate/${est.viewing_token}`} className="rounded-lg p-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="View Estimate"><ExternalLink className="h-3.5 w-3.5" /></a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(contracts || []).length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><FileSignature className="h-4 w-4" style={{ color: brandColor }} /> Contracts ({contracts.length})</h3>
                <div className="flex flex-col gap-2">
                  {contracts.map((c) => {
                    const signed = c.status === "signed" || !!c.customer_signed_at
                    return (
                      <div key={c.id} className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{c.contract_price ? `$${c.contract_price.toLocaleString()}` : "Contract"}</p>
                          <p className="text-[10px] text-gray-500">{formatDate(c.created_at)}{c.customer_signed_at && ` · Signed ${formatDate(c.customer_signed_at)}`}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${signed ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{signed ? "Signed" : "Pending"}</span>
                          {!signed && c.signing_token && <a href={`/sign/${c.signing_token}`} className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: brandColor }}>Sign Now</a>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {invoices.length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><CreditCard className="h-4 w-4" style={{ color: brandColor }} /> Invoices ({invoices.length})</h3>
                <div className="flex flex-col gap-2">
                  {invoices.map((inv) => {
                    const paid = inv.status === "paid"
                    return (
                      <div key={inv.id} className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-white">${inv.amount.toLocaleString()}{inv.invoice_number && <span className="ml-2 text-xs text-gray-500">#{inv.invoice_number}</span>}</p>
                          <p className="text-[10px] text-gray-500">{formatDate(inv.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${paid ? "bg-emerald-500/20 text-emerald-400" : inv.status === "overdue" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>{inv.status}</span>
                          {!paid && <a href={`/pay/${inv.id}`} className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: brandColor }}>Pay Now</a>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {(estimates || []).length === 0 && (contracts || []).length === 0 && invoices.length === 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-10 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-gray-600" />
                <p className="text-sm text-gray-400">No documents yet. Your contractor will share estimates, contracts, and invoices here.</p>
              </div>
            )}
          </>
        )}

        {/* ===== ACTIVITY ===== */}
        {activeTab === "activity" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold"><Activity className="h-4 w-4" style={{ color: brandColor }} /> Project Timeline</h3>
            <div className="relative ml-3 border-l-2 border-gray-800 pl-6">
              <div className="relative mb-6">
                <div className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-800 bg-gray-900"><Star className="h-3 w-3" style={{ color: brandColor }} /></div>
                <p className="text-sm font-semibold text-white">Project created</p>
                <p className="text-[10px] text-gray-500">{formatDateTime(job.created_at)}</p>
              </div>

              {(events || []).length > 0 && [...events].reverse().map((ev) => (
                <div key={ev.id} className="relative mb-6">
                  <div className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-800 bg-gray-900">{eventIcon(ev, brandColor)}</div>
                  <p className="text-sm font-semibold text-white">{eventLabel(ev)}</p>
                  <p className="text-[10px] text-gray-500">{formatDateTime(ev.created_at)}</p>
                </div>
              ))}

              <div className="relative">
                <div className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 bg-gray-900" style={{ borderColor: brandColor }}><Clock className="h-3 w-3" style={{ color: brandColor }} /></div>
                <p className="text-sm font-semibold" style={{ color: brandColor }}>Current: {job.status}</p>
                <p className="text-[10px] text-gray-500">Now</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== MESSAGES ===== */}
        {activeTab === "messages" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><MessageSquare className="h-4 w-4" style={{ color: brandColor }} /> Messages</h3>
            <div className="mb-4 flex max-h-[50vh] flex-col gap-2 overflow-y-auto rounded-xl bg-gray-800/30 p-3">
              {messages.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-500">No messages yet. Send a message to your contractor below.</p>
              ) : messages.map((msg) => {
                const mine = msg.sender === "homeowner"
                return (
                  <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${mine ? "rounded-br-md text-white" : "rounded-bl-md bg-gray-700 text-gray-100"}`} style={mine ? { backgroundColor: brandColor } : undefined}>
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <p className={`mt-1 text-[9px] ${mine ? "text-white/60" : "text-gray-400"}`}>{formatDateTime(msg.created_at)}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2">
              <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }} placeholder="Type a message..." rows={2} className="flex-1 resize-none rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500" />
              <button onClick={sendMessage} disabled={!newMessage.trim() || sendingMessage} className="flex h-auto items-center justify-center rounded-xl px-4 text-white transition-colors disabled:opacity-40" style={{ backgroundColor: brandColor }}><Send className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {/* Review CTA */}
        {job.status === "Completed" && contractor.google_review_url && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
            <Star className="mx-auto mb-2 h-8 w-8" style={{ color: brandColor }} />
            <h3 className="text-lg font-bold text-white">How did we do?</h3>
            <p className="mt-1 text-sm text-gray-400">Your feedback helps us serve you better</p>
            <a href={contractor.google_review_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-500">
              Leave a Review <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        <footer className="border-t border-gray-800 py-4 text-center">
          <p className="text-[10px] text-gray-500">Powered by <span className="font-bold text-gray-400">XRoof</span> — Professional roofing software</p>
        </footer>
      </main>
    </div>
  )
}
