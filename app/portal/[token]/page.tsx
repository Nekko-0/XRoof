"use client"

import { colorWithOpacity } from "@/lib/brand-colors"
import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import {
  MapPin, Phone, Mail, Calendar, DollarSign, FileText,
  CheckCircle, Clock, Wrench, Camera, Star, Building2,
  AlertCircle, ArrowRight, MessageSquare, Send,
  FileSignature, CreditCard, Activity, ExternalLink, Eye,
  ArrowLeftRight, Upload, Download, Package, Shield,
} from "lucide-react"
import { BeforeAfterSlider } from "@/components/before-after-slider"
import { GoogleReviewsBadge } from "@/components/google-reviews-badge"
import { t } from "@/lib/translations"

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

// Color-accurate swatch hex codes for roofing shingle colors
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

// Real product value descriptions by product line
const PRODUCT_VALUES: Record<string, string> = {
  // GAF
  "Timberline HD": "30-year warranty, architectural style",
  "Timberline HDZ": "StrikeZone nailing, 130 mph wind, algae protection",
  "Timberline UHDZ": "Ultra-premium layered look, 130 mph wind, lifetime warranty",
  // Atlas
  "StormMaster Slate": "Class 4 impact resistant, Scotchgard algae protection",
  "Pinnacle Pristine": "Scotchgard algae protection, 130 mph wind",
  "Architectural": "Economy architectural, 110 mph wind rating",
  // Owens Corning
  "Duration": "SureNail technology, 130 mph wind, algae resistance",
  // CertainTeed
  "Landmark": "Max Def colors, algae resistance, 110 mph wind",
  "Landmark PRO": "Max Def colors, 130 mph wind, 15-year algae warranty",
  // IKO
  "Cambridge": "Dual-layer laminate, algae resistance",
  "Dynasty": "ArmourZone nailing, 130 mph wind, impact resistant",
  // Tamko
  "Heritage": "3-piece lamination, algae resistant",
  // Malarkey
  "Vista AR": "Smog-reducing granules, algae protection",
  "Legacy": "Scotchgard algae protection, NEX polymer modified",
  "Highlander NEX": "Class 4 impact, Max Def, recycled content",
  // PABCO
  "Paramount": "Algae resistant, 110 mph wind rating",
  "Premier": "Algae resistant, 130 mph wind rating",
  // DaVinci
  "Bellaforté Slate": "Synthetic slate, lifetime warranty, Class 4 impact, fire resistant",
  "Bellaforté Shake": "Synthetic shake, lifetime warranty, Class 4 impact, fire resistant",
  // Decra
  "Metal Shingle Plus": "Stone-coated steel, 120 mph wind, fire & hail resistant",
  "Metal Shake": "Stone-coated steel shake profile, 120 mph wind resistant",
  "Metal Tile": "Stone-coated steel tile, 120 mph wind, energy efficient",
  // Boral
  "Barcelona 900": "Concrete tile, 50+ year lifespan, fire resistant",
  "Saxony Slate": "Concrete slate profile, fire resistant, energy efficient",
  // Eagle
  "Capistrano": "Concrete S-tile, 50+ year lifespan, fire resistant",
  "Bel Air": "Concrete flat tile, fire resistant, energy efficient",
  // Home Depot / Lowe's
  "3-Tab": "Economy 3-tab, 25-year warranty",
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  economy: { label: "$", color: "bg-gray-600 text-gray-200" },
  mid: { label: "$$", color: "bg-blue-600 text-blue-100" },
  premium: { label: "$$$", color: "bg-amber-600 text-amber-100" },
  luxury: { label: "$$$$", color: "bg-purple-600 text-purple-100" },
}

type CustomerDocument = {
  id: string
  job_id: string
  file_url: string
  file_name: string
  category: string
  created_at: string
}

type AppointmentInfo = {
  id: string
  title: string
  date: string
  time: string | null
  type: string
  duration_min: number | null
  notes: string | null
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
    google_reviews_cache: { rating: number; reviewCount: number } | null
    warranty_enabled?: boolean
    warranty_years?: number
    warranty_terms?: string
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
    accepted_tier_index: number | null
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
  appointments: AppointmentInfo[]
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

type TabId = "overview" | "documents" | "materials" | "activity" | "messages" | "warranty"

const MANUFACTURER_WARRANTIES: Record<string, string> = {
  "Timberline HDZ": "Lifetime Limited Warranty",
  "Timberline HD": "Lifetime Limited Warranty",
  "Timberline AS II": "Lifetime Limited Warranty",
  "Timberline NS": "Lifetime Limited Warranty",
  "Timberline UHDZ": "Lifetime Limited Warranty",
  "Grand Sequoia": "Lifetime Limited Warranty",
  "Camelot II": "Lifetime Limited Warranty",
  "Woodland": "Lifetime Limited Warranty",
  "Slateline": "Lifetime Limited Warranty",
  "Monaco": "Lifetime Limited Warranty",
  "Duration": "Limited Lifetime Warranty",
  "Duration FLEX": "Limited Lifetime Warranty",
  "Duration STORM": "Limited Lifetime Warranty",
  "Duration MAX": "Limited Lifetime Warranty",
  "TruDefinition Duration": "Limited Lifetime Warranty",
  "Oakridge": "Limited Lifetime Warranty",
  "Woodcrest": "Limited Lifetime Warranty",
  "Woodmoor": "Limited Lifetime Warranty",
  "Berkshire": "Limited Lifetime Warranty",
  "Landmark": "Limited Lifetime Warranty",
  "Landmark PRO": "Limited Lifetime Warranty",
  "Landmark TL": "Limited Lifetime Warranty",
  "Landmark Premium": "Limited Lifetime Warranty",
  "Grand Manor": "Limited Lifetime Warranty",
  "Presidential Shake": "Limited Lifetime Warranty",
  "Carriage House": "Limited Lifetime Warranty",
  "Highland Slate": "Limited Lifetime Warranty",
  "StormMaster Shake": "Limited Lifetime Warranty",
  "StormMaster Slate": "Limited Lifetime Warranty",
  "ProLam": "Limited Lifetime Warranty",
  "Pinnacle Pristine": "Limited Lifetime Warranty",
  "Cambridge": "Limited Lifetime Warranty",
  "Nordic": "Limited Lifetime Warranty",
  "Dynasty": "Limited Lifetime Warranty",
  "Crowne Slate": "Limited Lifetime Warranty",
  "Royal Estate": "Limited Lifetime Warranty",
  "Heritage": "30-Year Limited Warranty",
  "Heritage Woodgate": "30-Year Limited Warranty",
  "Titan XT": "Limited Lifetime Warranty",
  "Legacy": "Limited Lifetime Warranty",
  "Vista": "Limited Lifetime Warranty",
  "Windsor": "Limited Lifetime Warranty",
  "Centurion Slate": "Limited Lifetime Warranty",
  "Belmont": "50-Year Limited Warranty",
  "EcoChoice": "30-Year Limited Warranty",
  "DaVinci Slate": "Lifetime Limited Warranty",
  "DaVinci Shake": "Lifetime Limited Warranty",
  "Decra Stone Coated": "Limited Lifetime Warranty",
  "Decra Shake": "Limited Lifetime Warranty",
  "Decra Shingle": "Limited Lifetime Warranty",
}

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

  // Materials state
  const [materialBrands, setMaterialBrands] = useState<MaterialBrand[]>([])
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set())
  const [selectingMaterial, setSelectingMaterial] = useState<string | null>(null)

  // Customer documents state
  const [customerDocs, setCustomerDocs] = useState<CustomerDocument[]>([])
  const [uploadCategory, setUploadCategory] = useState("Photos")
  const [uploading, setUploading] = useState(false)

  // Visit request state
  const [showVisitRequest, setShowVisitRequest] = useState(false)
  const [visitPreferredDates, setVisitPreferredDates] = useState("")
  const [visitNotes, setVisitNotes] = useState("")
  const [visitPhone, setVisitPhone] = useState("")
  const [visitRequestSent, setVisitRequestSent] = useState(false)
  const [visitRequestLoading, setVisitRequestLoading] = useState(false)

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

  const fetchMaterials = async (jobId: string) => {
    try {
      const res = await fetch(`/api/portal/materials?job_id=${jobId}`)
      if (res.ok) {
        const json = await res.json()
        setMaterialBrands(json.brands || [])
        setSelectedMaterialIds(new Set(json.selectedIds || []))
      }
    } catch {}
  }

  const fetchCustomerDocs = async (jobId: string) => {
    try {
      const res = await fetch(`/api/portal/documents?job_id=${jobId}`)
      if (res.ok) { const json = await res.json(); setCustomerDocs(Array.isArray(json) ? json : []) }
    } catch {}
  }

  const selectMaterial = async (catalogItemId: string) => {
    if (!data?.job.id || selectingMaterial) return
    setSelectingMaterial(catalogItemId)
    try {
      const res = await fetch("/api/portal/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: data.job.id, catalog_item_id: catalogItemId }),
      })
      if (res.ok) {
        setSelectedMaterialIds((prev) => new Set([...prev, catalogItemId]))
      }
    } catch {}
    setSelectingMaterial(null)
  }

  const uploadDocument = async (file: File) => {
    if (!data?.job.id || uploading) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("job_id", data.job.id)
      formData.append("category", uploadCategory)
      formData.append("file", file)
      const res = await fetch("/api/portal/documents", { method: "POST", body: formData })
      if (res.ok) { await fetchCustomerDocs(data.job.id) }
    } catch {}
    setUploading(false)
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

  const submitVisitRequest = async () => {
    if (!data || visitRequestLoading) return
    setVisitRequestLoading(true)
    try {
      const msg = `📅 Visit Request\nPreferred dates: ${visitPreferredDates || "Flexible"}\nNotes: ${visitNotes || "None"}\nPhone: ${visitPhone || data.job.customer_phone || "Not provided"}`
      const res = await fetch("/api/portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: data.job.id, sender: "homeowner", message: msg }),
      })
      if (res.ok) {
        setVisitRequestSent(true)
        setShowVisitRequest(false)
        await fetchMessages(data.job.id)
      }
    } catch {}
    setVisitRequestLoading(false)
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
        fetchMaterials(json.job.id)
        fetchCustomerDocs(json.job.id)
      } catch { setError(true) }
      setLoading(false)
    }
    load()
  }, [token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-poll messages every 5s when Messages tab is active
  useEffect(() => {
    if (activeTab !== "messages" || !data?.job.id) return
    const interval = setInterval(() => fetchMessages(data.job.id), 5000)
    return () => clearInterval(interval)
  }, [activeTab, data?.job.id])

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
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-600" />
          <h1 className="text-xl font-bold text-white">Project Not Found</h1>
          <p className="mt-2 text-sm text-gray-500">This project link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  const { job, contractor, report, photos, contracts, estimates, appointments, events } = data
  const companyName = contractor.company_name || contractor.username || "Your Contractor"
  const brandColor = contractor.widget_color || "#3b82f6"

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === job.status)
  const progressPercent = currentStepIndex >= 0 ? ((currentStepIndex + 1) / STATUS_STEPS.length) * 100 : 0

  const unpaidInvoices = invoices.filter((i) => i.status !== "paid")

  const lang = (job as any).preferred_language || undefined

  const showWarranty = job.status === "Completed" && contractor.warranty_enabled

  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: t("portal.tab.overview", lang), icon: <Wrench className="h-4 w-4" /> },
    { id: "documents", label: t("portal.tab.documents", lang), icon: <FileText className="h-4 w-4" />, badge: unpaidInvoices.length || undefined },
    { id: "materials", label: t("portal.tab.materials", lang), icon: <Package className="h-4 w-4" /> },
    { id: "activity", label: t("portal.tab.activity", lang), icon: <Activity className="h-4 w-4" /> },
    { id: "messages", label: t("portal.tab.messages", lang), icon: <MessageSquare className="h-4 w-4" /> },
    ...(showWarranty ? [{ id: "warranty" as TabId, label: "Warranty", icon: <Shield className="h-4 w-4" /> }] : []),
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
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500">Project Portal</p>
                {contractor.google_reviews_cache && (
                  <GoogleReviewsBadge
                    rating={contractor.google_reviews_cache.rating}
                    reviewCount={contractor.google_reviews_cache.reviewCount}
                    reviewUrl={contractor.google_review_url}
                    className="text-gray-300 text-xs"
                  />
                )}
              </div>
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
          <p className="mt-1 text-sm text-gray-500">{t("portal.greeting", lang)}</p>
        </div>

        {/* ===== OVERVIEW ===== */}
        {activeTab === "overview" && (
          <>
            {/* Status */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
                <Wrench className="h-4 w-4" style={{ color: brandColor }} /> {t("portal.status", lang)}
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
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4" style={{ color: brandColor }} /> {t("portal.details", lang)}</h3>
                <div className="flex flex-col gap-2.5">
                  <div><p className="text-[10px] font-medium text-gray-500 uppercase">Address</p><p className="text-sm text-white">{job.address}</p></div>
                  <div><p className="text-[10px] font-medium text-gray-500 uppercase">Job Type</p><p className="text-sm text-white">{job.job_type || "Roofing"}</p></div>
                  {job.scheduled_date && (
                    <div><p className="text-[10px] font-medium text-gray-500 uppercase">Scheduled</p><p className="text-sm text-white flex items-center gap-1"><Calendar className="h-3 w-3" style={{ color: brandColor }} />{new Date(job.scheduled_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p></div>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Building2 className="h-4 w-4" style={{ color: brandColor }} /> {t("portal.contractor", lang)}</h3>
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
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><DollarSign className="h-4 w-4" style={{ color: brandColor }} /> {t("portal.estimate", lang)}</h3>
                {report.pricing_tiers && report.pricing_tiers.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {report.pricing_tiers.map((tier, i) => {
                      const isAccepted = report.accepted_tier_index === i
                      return (
                        <div key={i} className={`rounded-xl border p-4 text-center ${isAccepted ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/10" : i === 1 && report.accepted_tier_index == null ? "ring-1" : "border-gray-700 bg-gray-800/50 opacity-60"}`} style={!isAccepted && i === 1 && report.accepted_tier_index == null ? { borderColor: brandColor, backgroundColor: colorWithOpacity(brandColor, 0.1) } : undefined}>
                          {isAccepted && <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400">Your Selection</p>}
                          {!isAccepted && i === 1 && report.accepted_tier_index == null && <p className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: brandColor }}>Most Popular</p>}
                          <p className="text-sm font-bold text-white">{tier.name}</p>
                          <p className="mt-1 text-2xl font-bold" style={{ color: isAccepted ? "#10b981" : brandColor }}>{tier.price ? `$${tier.price.toLocaleString()}` : "TBD"}</p>
                          {tier.description && <p className="mt-1 text-[11px] text-gray-500">{tier.description}</p>}
                        </div>
                      )
                    })}
                  </div>
                ) : report.price_quote ? (
                  <div className="text-center py-2">
                    <p className="text-3xl font-bold" style={{ color: brandColor }}>${report.price_quote.toLocaleString()}</p>
                    {report.deposit_percent && <p className="mt-1 text-xs text-gray-500">Deposit: ${Math.round(report.price_quote * report.deposit_percent / 100).toLocaleString()} ({report.deposit_percent}%)</p>}
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
                  <p className="text-xs text-gray-500 mb-3">Drag the slider to compare.</p>
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
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Camera className="h-4 w-4" style={{ color: brandColor }} /> {t("portal.photos", lang)} ({photos.length})</h3>
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
                <h3 className="mb-3 text-sm font-bold text-amber-600">{t("portal.action_required", lang)}</h3>
                <div className="flex flex-col gap-2">
                  {unpaidInvoices.map((inv) => (
                    <a key={inv.id} href={`/pay/${inv.id}`} className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3 hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-4 w-4 text-amber-600" />
                        <div><p className="text-sm font-semibold text-white">Pay Invoice — ${(inv.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p><p className="text-[10px] text-gray-500">{inv.invoice_number || formatDate(inv.created_at)}</p></div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-500" />
                    </a>
                  ))}
                  {(contracts || []).filter((c) => c.status !== "signed" && c.signing_token).map((c) => (
                    <a key={c.id} href={`/sign/${c.signing_token}`} className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3 hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileSignature className="h-4 w-4 text-amber-600" />
                        <div><p className="text-sm font-semibold text-white">Sign Contract</p><p className="text-[10px] text-gray-500">{c.contract_price ? `$${c.contract_price.toLocaleString()}` : ""}</p></div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Appointments */}
            {appointments.length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <Calendar className="h-4 w-4" style={{ color: brandColor }} /> {t("portal.upcoming", lang)}
                </h3>
                <div className="flex flex-col gap-3">
                  {appointments.map((appt) => {
                    const isWorkStart = appt.type === "work_start"
                    const typeLabels: Record<string, string> = {
                      site_visit: "Site Visit", work_start: "Work Begins",
                      inspection: "Inspection", meeting: "Meeting", other: "Appointment",
                    }
                    const TypeIcon = isWorkStart ? Wrench
                      : appt.type === "inspection" ? Eye
                      : appt.type === "meeting" ? MessageSquare
                      : Calendar
                    const timeStr = appt.time ? (() => {
                      const [h, m] = appt.time.split(":").map(Number)
                      const ampm = h >= 12 ? "PM" : "AM"
                      const h12 = h % 12 || 12
                      return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
                    })() : null
                    return (
                      <div key={appt.id} className="rounded-xl bg-gray-800/50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <TypeIcon className="h-4 w-4 flex-shrink-0" style={{ color: brandColor }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{appt.title || typeLabels[appt.type] || "Appointment"}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(appt.date)}{timeStr && ` at ${timeStr}`}
                              {appt.duration_min && !isWorkStart ? ` · ${appt.duration_min} min` : ""}
                            </p>
                          </div>
                        </div>
                        {isWorkStart && (
                          <p className="mt-2 text-[10px] text-gray-500 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> Weather permitting — your contractor will notify you of any changes
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button
                  onClick={() => {
                    const msg = "I need to reschedule — please contact me to find a new time."
                    fetch("/api/portal/messages", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ job_id: job.id, sender: "homeowner", message: msg }),
                    }).then(() => { setActiveTab("messages"); fetchMessages(job.id) })
                  }}
                  className="mt-3 text-[11px] font-medium text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Request Reschedule
                </button>
              </div>
            )}

            {/* Request a Visit */}
            {appointments.length === 0 && !visitRequestSent && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <Calendar className="h-4 w-4" style={{ color: brandColor }} /> Need a Site Visit?
                </h3>
                <p className="text-xs text-gray-500 mb-4">Request a visit and your contractor will schedule a time that works.</p>
                {!showVisitRequest ? (
                  <button
                    onClick={() => { setShowVisitRequest(true); setVisitPhone(job.customer_phone || "") }}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors"
                    style={{ backgroundColor: brandColor }}
                  >
                    <Calendar className="h-4 w-4" /> Request Visit
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase">Preferred Dates (optional)</label>
                      <input
                        type="text"
                        value={visitPreferredDates}
                        onChange={(e) => setVisitPreferredDates(e.target.value)}
                        placeholder="e.g. Next week, mornings preferred"
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase">Notes (optional)</label>
                      <textarea
                        value={visitNotes}
                        onChange={(e) => setVisitNotes(e.target.value)}
                        rows={2}
                        placeholder="Anything we should know before the visit?"
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase">Phone</label>
                      <input
                        type="tel"
                        value={visitPhone}
                        onChange={(e) => setVisitPhone(e.target.value)}
                        placeholder="For scheduling contact"
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={submitVisitRequest}
                        disabled={visitRequestLoading}
                        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
                        style={{ backgroundColor: brandColor }}
                      >
                        {visitRequestLoading ? "Sending..." : "Send Request"}
                      </button>
                      <button
                        onClick={() => setShowVisitRequest(false)}
                        className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {visitRequestSent && appointments.length === 0 && (
              <div className="rounded-2xl border p-5" style={{ borderColor: brandColor, backgroundColor: colorWithOpacity(brandColor, 0.05) }}>
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6" style={{ color: brandColor }} />
                  <div>
                    <h3 className="text-sm font-bold text-white">Visit Request Sent</h3>
                    <p className="text-xs text-gray-500">Your contractor will schedule a time and you&apos;ll be notified.</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== DOCUMENTS ===== */}
        {activeTab === "documents" && (
          <>
            {/* Document Upload */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Upload className="h-4 w-4" style={{ color: brandColor }} /> {t("portal.documents.upload", lang)}
              </h3>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase">{t("portal.documents.category", lang)}</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Insurance">Insurance</option>
                    <option value="Photos">Photos</option>
                    <option value="HOA">HOA</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors" style={{ backgroundColor: uploading ? "#6b7280" : brandColor }}>
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading..." : t("portal.documents.upload", lang)}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadDocument(file)
                      e.target.value = ""
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Customer Uploaded Documents */}
            {customerDocs.length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <FileText className="h-4 w-4" style={{ color: brandColor }} /> {t("portal.documents.your_uploads", lang)} ({customerDocs.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {customerDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-600">{doc.category}</span>
                          <span className="text-[10px] text-gray-500">{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-gray-500 hover:text-white hover:bg-gray-700 transition-colors" title="Download">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${est.estimate_accepted ? "bg-emerald-500/20 text-emerald-600" : "bg-blue-500/20 text-blue-600"}`}>{est.estimate_accepted ? "Accepted" : "Pending"}</span>
                        {est.viewing_token && <a href={`/estimate/${est.viewing_token}`} className="rounded-lg p-2 text-gray-500 hover:text-white hover:bg-gray-700 transition-colors" title="View Estimate"><ExternalLink className="h-3.5 w-3.5" /></a>}
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
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${signed ? "bg-emerald-500/20 text-emerald-600" : "bg-amber-500/20 text-amber-600"}`}>{signed ? "Signed" : "Pending"}</span>
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
                          <p className="text-sm font-semibold text-white">${(inv.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}{inv.invoice_number && <span className="ml-2 text-xs text-gray-500">#{inv.invoice_number}</span>}</p>
                          <p className="text-[10px] text-gray-500">{formatDate(inv.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${paid ? "bg-emerald-500/20 text-emerald-600" : inv.status === "overdue" ? "bg-red-500/20 text-red-600" : "bg-amber-500/20 text-amber-600"}`}>{inv.status}</span>
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
                <p className="text-sm text-gray-500">No documents yet. Your contractor will share estimates, contracts, and invoices here.</p>
              </div>
            )}
          </>
        )}

        {/* ===== MATERIALS ===== */}
        {activeTab === "materials" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <Package className="h-4 w-4" style={{ color: brandColor }} /> {t("portal.materials.title", lang)}
            </h3>
            {materialBrands.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="mx-auto mb-3 h-10 w-10 text-gray-600" />
                <p className="text-sm text-gray-500">{t("portal.materials.empty", lang)}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {materialBrands.map((brand) => (
                  <div key={brand.name}>
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">{brand.name}</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {brand.products.map((item) => {
                        const isSelected = selectedMaterialIds.has(item.id)
                        const tier = item.price_tier ? TIER_LABELS[item.price_tier] : null
                        const valueDesc = PRODUCT_VALUES[item.product_line]
                        return (
                          <div
                            key={item.id}
                            className={`rounded-xl border p-4 transition-colors ${
                              isSelected
                                ? "border-emerald-500/40 bg-emerald-500/10"
                                : "border-gray-500/30 bg-gray-800 hover:border-gray-500"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.color} className="h-12 w-12 rounded-lg object-cover flex-shrink-0 border border-gray-500/30" />
                              ) : (
                                <div
                                  className="h-12 w-12 rounded-lg flex-shrink-0 border border-gray-500/30"
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
                                <p className="text-sm font-bold text-white">{item.color}</p>
                                <p className="text-[11px] text-gray-500">{item.product_line}</p>
                                {valueDesc && (
                                  <p className="mt-0.5 text-[10px] text-gray-500">{valueDesc}</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              {tier ? (
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${tier.color}`}>
                                  {tier.label} {item.price_tier}
                                </span>
                              ) : <span />}
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-600">
                                  <CheckCircle className="h-3.5 w-3.5" /> {t("portal.materials.selected", lang)}
                                </span>
                              ) : (
                                <button
                                  onClick={() => selectMaterial(item.id)}
                                  disabled={selectingMaterial === item.id}
                                  className="rounded-lg px-4 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-50"
                                  style={{ backgroundColor: brandColor }}
                                >
                                  {selectingMaterial === item.id ? "..." : t("portal.materials.select", lang)}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== ACTIVITY ===== */}
        {activeTab === "activity" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold"><Activity className="h-4 w-4" style={{ color: brandColor }} /> {t("portal.timeline", lang)}</h3>
            <div className="relative ml-3 border-l-2 border-gray-800 pl-6">
              <div className="relative mb-6">
                <div className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-800 bg-gray-900"><Star className="h-3 w-3" style={{ color: brandColor }} /></div>
                <p className="text-sm font-semibold text-white">Project created</p>
                <p className="text-[10px] text-gray-500">{formatDateTime(job.created_at)}</p>
              </div>

              {(events || []).length > 0 && [...events].reverse().filter((ev) => ev.event_type !== "opened").map((ev) => (
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
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><MessageSquare className="h-4 w-4" style={{ color: brandColor }} /> {t("portal.messages", lang)}</h3>
            <div className="mb-4 flex max-h-[50vh] flex-col gap-2 overflow-y-auto rounded-xl bg-gray-500/15 p-3">
              {messages.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-500">No messages yet. Send a message to your contractor below.</p>
              ) : messages.map((msg) => {
                const mine = msg.sender === "homeowner"
                return (
                  <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${mine ? "rounded-br-md text-white" : "rounded-bl-md bg-gray-700 text-gray-100"}`} style={mine ? { backgroundColor: brandColor } : undefined}>
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <p className={`mt-1 text-[9px] ${mine ? "text-white/60" : "text-gray-500"}`}>{formatDateTime(msg.created_at)}</p>
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

        {/* Warranty Tab */}
        {activeTab === "warranty" && showWarranty && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-500/30 bg-gray-800 p-6 text-center">
              <Shield className="mx-auto mb-3 h-12 w-12" style={{ color: brandColor }} />
              <h3 className="text-xl font-bold text-white mb-1">Warranty Certificate</h3>
              <p className="text-sm text-gray-500">Your project is covered by the following warranties</p>
            </div>

            {/* Workmanship Warranty */}
            <div className="rounded-2xl border border-gray-500/30 bg-gray-800 p-5">
              <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                <Shield className="h-4 w-4" style={{ color: brandColor }} />
                Workmanship Warranty
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-gray-700/50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Contractor</p>
                  <p className="font-semibold text-white">{contractor.company_name}</p>
                </div>
                <div className="rounded-xl bg-gray-700/50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Coverage Period</p>
                  <p className="font-semibold text-white">
                    {contractor.warranty_years === 0 ? "Lifetime" : `${contractor.warranty_years} Year${(contractor.warranty_years || 1) > 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-700/50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Completion Date</p>
                  <p className="font-semibold text-white">{formatDate(job.created_at)}</p>
                </div>
                <div className="rounded-xl bg-gray-700/50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Property</p>
                  <p className="font-semibold text-white truncate">{job.address}</p>
                </div>
              </div>
              {contractor.warranty_terms && (
                <div className="mt-4 rounded-xl bg-gray-700/30 p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Terms & Conditions</p>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{contractor.warranty_terms}</p>
                </div>
              )}
            </div>

            {/* Manufacturer Warranty — show for each selected material */}
            {materialBrands.length > 0 && (
              <div className="rounded-2xl border border-gray-500/30 bg-gray-800 p-5">
                <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                  <Package className="h-4 w-4" style={{ color: brandColor }} />
                  Manufacturer Warranties
                </h4>
                <div className="space-y-2">
                  {materialBrands.flatMap((brand) =>
                    brand.products
                      .filter((item) => selectedMaterialIds.has(item.id))
                      .map((item) => {
                        const mfgWarranty = MANUFACTURER_WARRANTIES[item.product_line] || "See manufacturer documentation"
                        return (
                          <div key={item.id} className="flex items-center justify-between rounded-xl bg-gray-700/50 px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-white">{brand.name} {item.product_line}</p>
                              <p className="text-xs text-gray-500">{item.color}</p>
                            </div>
                            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-600">{mfgWarranty}</span>
                          </div>
                        )
                      })
                  )}
                  {materialBrands.every((b) => b.products.every((p) => !selectedMaterialIds.has(p.id))) && (
                    <p className="py-3 text-center text-xs text-gray-500">No materials selected yet. Select materials in the Materials tab to see manufacturer warranties.</p>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-gray-700/30 p-4 text-center">
              <p className="text-xs text-gray-500">
                Questions about your warranty? Contact {contractor.company_name} at{" "}
                <a href={`tel:${contractor.phone}`} className="underline" style={{ color: brandColor }}>{contractor.phone}</a>
                {contractor.email && (
                  <> or <a href={`mailto:${contractor.email}`} className="underline" style={{ color: brandColor }}>{contractor.email}</a></>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Review CTA */}
        {job.status === "Completed" && contractor.google_review_url && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
            <Star className="mx-auto mb-2 h-8 w-8" style={{ color: brandColor }} />
            <h3 className="text-lg font-bold text-white">How did we do?</h3>
            <p className="mt-1 text-sm text-gray-500">Your feedback helps us serve you better</p>
            <a href={contractor.google_review_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-500">
              Leave a Review <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        <footer className="border-t border-gray-800 py-4 text-center">
          <p className="text-[10px] text-gray-500">Powered by <span className="font-bold text-gray-500">XRoof</span> — Professional roofing software</p>
        </footer>
      </main>
    </div>
  )
}
