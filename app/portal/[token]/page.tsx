"use client"

import { darkenColor, lightenColor, colorWithOpacity } from "@/lib/brand-colors"
import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import {
  MapPin, Phone, Mail, Calendar, DollarSign, FileText,
  CheckCircle, Clock, Wrench, Camera, Star, Building2,
  AlertCircle, ArrowRight, MessageSquare, Send,
} from "lucide-react"

type PortalMessage = {
  id: string
  job_id: string
  sender: "homeowner" | "contractor"
  message: string
  created_at: string
}

type Invoice = {
  id: string
  amount: number
  status: string
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
}

const STATUS_STEPS = [
  { status: "New", label: "Lead Created" },
  { status: "Accepted", label: "Job Accepted" },
  { status: "Estimate Sent", label: "Estimate Sent" },
  { status: "Scheduled", label: "Scheduled" },
  { status: "In Progress", label: "In Progress" },
  { status: "Completed", label: "Completed" },
]

export default function HomeownerPortal() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Messaging state
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Payment history state
  const [invoices, setInvoices] = useState<Invoice[]>([])

  const fetchMessages = async (jobId: string) => {
    try {
      const res = await fetch(`/api/portal/messages?job_id=${jobId}`)
      if (res.ok) {
        const json = await res.json()
        setMessages(json.messages || [])
      }
    } catch {}
  }

  const fetchInvoices = async (jobId: string) => {
    try {
      const res = await fetch(`/api/portal/invoices?job_id=${jobId}`)
      if (res.ok) {
        const json = await res.json()
        setInvoices(json.invoices || [])
      }
    } catch {}
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !data?.job.id || sendingMessage) return
    setSendingMessage(true)
    try {
      const res = await fetch("/api/portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: data.job.id,
          sender: "homeowner",
          message: newMessage.trim(),
        }),
      })
      if (res.ok) {
        setNewMessage("")
        await fetchMessages(data.job.id)
      }
    } catch {}
    setSendingMessage(false)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/portal?token=${token}`)
        if (!res.ok) { setError(true); setLoading(false); return }
        const json = await res.json()
        if (json.error) { setError(true); setLoading(false); return }
        setData(json)
        // Load messages and invoices once we have the job
        fetchMessages(json.job.id)
        fetchInvoices(json.job.id)
      } catch {
        setError(true)
      }
      setLoading(false)
    }
    load()
  }, [token])

  // Scroll to bottom when messages update
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

  const { job, contractor, report, photos } = data
  const companyName = contractor.company_name || contractor.username || "Your Contractor"
  const brandColor = contractor.widget_color || "#3b82f6"
  const brandDark = darkenColor(brandColor, 30)

  // Progress bar
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === job.status)
  const progressPercent = currentStepIndex >= 0 ? ((currentStepIndex + 1) / STATUS_STEPS.length) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            {contractor.logo_url && <img src={contractor.logo_url} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />}
            <div>
              <h1 className="text-lg font-bold">{companyName}</h1>
              <p className="text-xs text-gray-400">Project Portal</p>
            </div>
          </div>
          {contractor.phone && (
            <a
              href={`tel:${contractor.phone}`}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors"
              style={{ backgroundColor: brandColor }}
            >
              <Phone className="h-4 w-4" />
              Call Us
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6 flex flex-col gap-5">
        {/* Greeting */}
        <div>
          <h2 className="text-2xl font-bold">Hi {job.customer_name.split(" ")[0]},</h2>
          <p className="mt-1 text-sm text-gray-400">Here&apos;s the latest on your roofing project</p>
        </div>

        {/* Project Status */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Wrench className="h-4 w-4" style={{ color: brandColor }} />
            Project Status
          </h3>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-2 w-full rounded-full bg-gray-800">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%`, backgroundColor: brandColor }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="flex justify-between">
            {STATUS_STEPS.map((step, i) => {
              const isCompleted = i <= currentStepIndex
              const isCurrent = i === currentStepIndex
              return (
                <div key={step.status} className="flex flex-col items-center gap-1">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                    isCompleted ? "" : "border-gray-700 bg-gray-800"
                  }`} style={isCompleted ? { borderColor: brandColor, backgroundColor: colorWithOpacity(brandColor, 0.2) } : undefined}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" style={{ color: brandColor }} />
                    ) : (
                      <span className="text-[10px] text-gray-500">{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${
                    isCurrent ? "text-white" : isCompleted ? "" : "text-gray-500"
                  }`} style={isCompleted && !isCurrent ? { color: brandColor } : undefined}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Project Details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <MapPin className="h-4 w-4" style={{ color: brandColor }} />
              Project Details
            </h3>
            <div className="flex flex-col gap-2.5">
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase">Address</p>
                <p className="text-sm text-white">{job.address}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase">Job Type</p>
                <p className="text-sm text-white">{job.job_type || "Roofing"}</p>
              </div>
              {job.scheduled_date && (
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase">Scheduled</p>
                  <p className="text-sm text-white flex items-center gap-1">
                    <Calendar className="h-3 w-3" style={{ color: brandColor }} />
                    {new Date(job.scheduled_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Building2 className="h-4 w-4" style={{ color: brandColor }} />
              Your Contractor
            </h3>
            <div className="flex flex-col gap-2.5">
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase">Company</p>
                <p className="text-sm text-white">{companyName}</p>
              </div>
              {contractor.phone && (
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase">Phone</p>
                  <a href={`tel:${contractor.phone}`} className="text-sm hover:underline flex items-center gap-1" style={{ color: brandColor }}>
                    <Phone className="h-3 w-3" /> {contractor.phone}
                  </a>
                </div>
              )}
              {contractor.email && (
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase">Email</p>
                  <a href={`mailto:${contractor.email}`} className="text-sm hover:underline flex items-center gap-1" style={{ color: brandColor }}>
                    <Mail className="h-3 w-3" /> {contractor.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estimate / Pricing */}
        {report && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <DollarSign className="h-4 w-4" style={{ color: brandColor }} />
              Your Estimate
            </h3>

            {report.pricing_tiers && report.pricing_tiers.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {report.pricing_tiers.map((tier, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-4 text-center transition-all ${
                      i === 1 ? "ring-1" : "border-gray-700 bg-gray-800/50"
                    }`}
                    style={i === 1 ? { borderColor: brandColor, backgroundColor: colorWithOpacity(brandColor, 0.1), boxShadow: `0 0 0 1px ${colorWithOpacity(brandColor, 0.3)}` } : undefined}
                  >
                    {i === 1 && <p className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: brandColor }}>Most Popular</p>}
                    <p className="text-sm font-bold text-white">{tier.name}</p>
                    <p className="mt-1 text-2xl font-bold" style={{ color: brandColor }}>
                      {tier.price ? `$${tier.price.toLocaleString()}` : "TBD"}
                    </p>
                    {tier.description && <p className="mt-1 text-[11px] text-gray-400">{tier.description}</p>}
                  </div>
                ))}
              </div>
            ) : report.price_quote ? (
              <div className="text-center py-2">
                <p className="text-3xl font-bold" style={{ color: brandColor }}>${report.price_quote.toLocaleString()}</p>
                {report.deposit_percent && (
                  <p className="mt-1 text-xs text-gray-400">
                    Deposit: ${Math.round(report.price_quote * report.deposit_percent / 100).toLocaleString()} ({report.deposit_percent}%)
                  </p>
                )}
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

        {/* Photos */}
        {photos.length > 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Camera className="h-4 w-4" style={{ color: brandColor }} />
              Project Photos ({photos.length})
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((p) => (
                <div key={p.id} className="group relative overflow-hidden rounded-xl">
                  <img
                    src={p.url}
                    alt={p.caption || "Project photo"}
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                  />
                  {p.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-[10px] text-white">{p.caption}</p>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-semibold text-white capitalize">
                    {p.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment History */}
        {invoices.length > 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <DollarSign className="h-4 w-4" style={{ color: brandColor }} />
              Payment History
            </h3>
            <div className="flex flex-col gap-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      ${inv.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(inv.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      inv.status === "paid"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : inv.status === "overdue"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <MessageSquare className="h-4 w-4" style={{ color: brandColor }} />
            Messages
          </h3>

          {/* Message list */}
          <div className="mb-4 flex max-h-80 flex-col gap-2 overflow-y-auto rounded-xl bg-gray-800/30 p-3">
            {messages.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-500">
                No messages yet. Send a message to your contractor below.
              </p>
            ) : (
              messages.map((msg) => {
                const isHomeowner = msg.sender === "homeowner"
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isHomeowner ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                        isHomeowner
                          ? "rounded-br-md text-white"
                          : "rounded-bl-md bg-gray-700 text-gray-100"
                      }`}
                      style={isHomeowner ? { backgroundColor: brandColor } : undefined}
                    >
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <p
                        className={`mt-1 text-[9px] ${
                          isHomeowner ? "text-blue-200" : "text-gray-400"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send form */}
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Type a message..."
              rows={2}
              className="flex-1 resize-none rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sendingMessage}
              className="flex h-auto items-center justify-center rounded-xl px-4 text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: brandColor }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Review CTA — only show if completed */}
        {job.status === "Completed" && contractor.google_review_url && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
            <Star className="mx-auto mb-2 h-8 w-8" style={{ color: brandColor }} />
            <h3 className="text-lg font-bold text-white">How did we do?</h3>
            <p className="mt-1 text-sm text-gray-400">Your feedback helps us serve you better</p>
            <a
              href={contractor.google_review_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-500"
            >
              Leave a Review
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-800 py-4 text-center">
          <p className="text-[10px] text-gray-500">
            Powered by <span className="font-bold text-gray-400">XRoof</span> — Professional roofing software
          </p>
        </footer>
      </main>
    </div>
  )
}
