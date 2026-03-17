"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import { useToast } from "@/lib/toast-context"
import {
  Save, Eye, Upload, EyeOff, Trash2, ImageIcon, Building2,
  User, MapPin, Phone, Mail, FileText, DollarSign, Wrench,
  MessageSquare, Calendar, Hash, Ruler, Calculator, EyeOff as EyeOffIcon,
  ChevronDown, ChevronUp, BookTemplate, FolderOpen, Printer, Download,
  Send, CheckCircle, Clock, Activity,
} from "lucide-react"

interface PricingTier {
  name: string
  description: string
  price: number | null
}

interface EstimateLineItem {
  description: string
  quantity: number
  unit_price: number
}

interface ReportData {
  id?: string
  // Header
  company_name: string
  company_email: string
  company_phone: string
  logo_url: string
  // Property
  customer_name: string
  customer_address: string
  customer_phone: string
  job_type: string
  // Roof
  roof_squares: number | null
  roof_pitch: string
  // Photos
  photo_urls: string[]
  photo_captions: string[]
  photo_visible: boolean[]
  // Content
  scope_of_work: string
  recommendations: string
  price_quote: number | null
  material: string
  notes: string
  // Prepared By
  worker_name: string
  worker_title: string
  worker_phone: string
  // Meta
  report_completed: boolean
  measurement_data: any
  materials_visible: boolean
  materials_data: any
  // Pricing tiers
  pricing_tiers: PricingTier[] | null
  deposit_percent: number | null
  // Line items
  estimate_line_items: EstimateLineItem[] | null
}

const emptyReport: ReportData = {
  company_name: "",
  company_email: "",
  company_phone: "",
  logo_url: "",
  customer_name: "",
  customer_address: "",
  customer_phone: "",
  job_type: "",
  roof_squares: null,
  roof_pitch: "",
  photo_urls: ["", "", "", ""],
  photo_captions: ["", "", "", ""],
  photo_visible: [true, true, true, true],
  scope_of_work: "",
  recommendations: "",
  price_quote: null,
  material: "",
  notes: "",
  worker_name: "",
  worker_title: "",
  worker_phone: "",
  report_completed: false,
  measurement_data: null,
  materials_visible: false,
  materials_data: null,
  pricing_tiers: null,
  deposit_percent: 10,
  estimate_line_items: null,
}

interface ReportBuilderProps {
  reportId?: string | null
  onSaved?: (reportId: string) => void
  onPreview?: (reportId: string) => void
}

export function ReportBuilder({ reportId, onSaved, onPreview }: ReportBuilderProps) {
  const toast = useToast()
  const [report, setReport] = useState<ReportData>({ ...emptyReport })
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(reportId || null)
  const [uploading, setUploading] = useState<number | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [showMaterial, setShowMaterial] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [showSendForm, setShowSendForm] = useState(false)
  const [customerEmail, setCustomerEmail] = useState("")
  const [sending, setSending] = useState(false)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null])
  const logoInputRef = useRef<HTMLInputElement>(null)

  // PDF download state
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Line items state
  const [showLineItems, setShowLineItems] = useState(false)

  // Activity tracking state
  const [activityEvents, setActivityEvents] = useState<{ id: string; event_type: string; recipient_email: string; created_at: string }[]>([])

  // Template state
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [showLoadTemplate, setShowLoadTemplate] = useState(false)
  const [templates, setTemplates] = useState<{ id: string; name: string; created_at: string }[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Template functions
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setSavingTemplate(true)
    const templateData = {
      company_name: report.company_name,
      company_email: report.company_email,
      company_phone: report.company_phone,
      logo_url: report.logo_url,
      job_type: report.job_type,
      scope_of_work: report.scope_of_work,
      recommendations: report.recommendations,
      material: report.material,
      notes: report.notes,
      worker_name: report.worker_name,
      worker_title: report.worker_title,
      worker_phone: report.worker_phone,
      materials_data: report.materials_data,
      pricing_tiers: report.pricing_tiers,
      deposit_percent: report.deposit_percent,
      estimate_line_items: report.estimate_line_items,
    }

    const { error } = await supabase.from("report_templates").insert({
      contractor_id: session.user.id,
      name: templateName.trim(),
      template_data: templateData,
    })

    if (error) {
      toast.error("Error saving template: " + error.message)
    } else {
      toast.success("Template saved!")
      setTemplateName("")
      setShowSaveTemplate(false)
    }
    setSavingTemplate(false)
  }

  const loadTemplateList = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setLoadingTemplates(true)
    const { data } = await supabase
      .from("report_templates")
      .select("id, name, created_at")
      .eq("contractor_id", session.user.id)
      .order("created_at", { ascending: false })

    setTemplates(data || [])
    setLoadingTemplates(false)
  }

  const handleLoadTemplate = async (templateId: string) => {
    const { data } = await supabase
      .from("report_templates")
      .select("template_data")
      .eq("id", templateId)
      .single()

    if (data?.template_data) {
      const t = data.template_data
      setReport((prev) => ({
        ...prev,
        company_name: t.company_name || prev.company_name,
        company_email: t.company_email || prev.company_email,
        company_phone: t.company_phone || prev.company_phone,
        logo_url: t.logo_url || prev.logo_url,
        job_type: t.job_type || prev.job_type,
        scope_of_work: t.scope_of_work || prev.scope_of_work,
        recommendations: t.recommendations || prev.recommendations,
        material: t.material || prev.material,
        notes: t.notes || prev.notes,
        worker_name: t.worker_name || prev.worker_name,
        worker_title: t.worker_title || prev.worker_title,
        worker_phone: t.worker_phone || prev.worker_phone,
        materials_data: t.materials_data || prev.materials_data,
        pricing_tiers: t.pricing_tiers || prev.pricing_tiers,
        deposit_percent: t.deposit_percent ?? prev.deposit_percent,
        estimate_line_items: t.estimate_line_items || prev.estimate_line_items,
      }))
      setShowLoadTemplate(false)
      toast.success("Template loaded!")
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Delete this template?")) return
    await supabase.from("report_templates").delete().eq("id", templateId)
    setTemplates((prev) => prev.filter((t) => t.id !== templateId))
  }

  // Load existing report
  useEffect(() => {
    if (!reportId || reportId === "new") {
      // Check for measurement data from sessionStorage
      const stored = sessionStorage.getItem("measurement_data")
      if (stored) {
        try {
          const data = JSON.parse(stored)
          setReport((prev) => ({
            ...prev,
            customer_address: data.address || "",
            roof_squares: data.total_squares || null,
            roof_pitch: data.pitch || "",
            measurement_data: data,
          }))
          sessionStorage.removeItem("measurement_data")
        } catch {}
      }
      // Check for material estimate items from Material Calculator
      const materialItems = sessionStorage.getItem("material_estimate_items")
      if (materialItems) {
        try {
          const items = JSON.parse(materialItems) as { description: string; quantity: number; unit_price: number }[]
          setReport((prev) => ({
            ...prev,
            estimate_line_items: items,
            price_quote: items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
          }))
          sessionStorage.removeItem("material_estimate_items")
          setShowLineItems(true)
        } catch {}
      }
      return
    }

    const load = async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single()

      if (data) {
        setReport({
          company_name: data.company_name || "",
          company_email: data.company_email || "",
          company_phone: data.company_phone || "",
          logo_url: data.logo_url || "",
          customer_name: data.customer_name || "",
          customer_address: data.customer_address || "",
          customer_phone: data.customer_phone || "",
          job_type: data.job_type || "",
          roof_squares: data.roof_squares,
          roof_pitch: data.roof_pitch || "",
          photo_urls: data.photo_urls || ["", "", "", ""],
          photo_captions: data.photo_captions || ["", "", "", ""],
          photo_visible: data.photo_visible || [true, true, true, true],
          scope_of_work: data.scope_of_work || "",
          recommendations: data.recommendations || "",
          price_quote: data.price_quote,
          material: data.material || "",
          notes: data.notes || "",
          worker_name: data.worker_name || "",
          worker_title: data.worker_title || "",
          worker_phone: data.worker_phone || "",
          report_completed: data.report_completed || false,
          measurement_data: data.measurement_data,
          materials_visible: data.materials_visible || false,
          materials_data: data.materials_data || null,
          pricing_tiers: data.pricing_tiers || null,
          deposit_percent: data.deposit_percent ?? 10,
          estimate_line_items: data.estimate_line_items || null,
        })
        setSavedId(data.id)
      }
    }
    load()
  }, [reportId])

  // Fetch activity events for saved reports
  useEffect(() => {
    if (!savedId || savedId === "new") return
    const fetchActivity = async () => {
      try {
        const res = await authFetch(`/api/reports/${savedId}/activity`)
        if (res.ok) {
          const data = await res.json()
          setActivityEvents(data)
        }
      } catch {}
    }
    fetchActivity()
  }, [savedId])

  const updateField = <K extends keyof ReportData>(key: K, value: ReportData[K]) => {
    setReport((prev) => ({ ...prev, [key]: value }))
  }

  const updatePhoto = (index: number, field: "url" | "caption" | "visible", value: any) => {
    setReport((prev) => {
      const updated = { ...prev }
      if (field === "url") {
        const urls = [...prev.photo_urls]
        urls[index] = value
        updated.photo_urls = urls
      } else if (field === "caption") {
        const captions = [...prev.photo_captions]
        captions[index] = value
        updated.photo_captions = captions
      } else {
        const visible = [...prev.photo_visible]
        visible[index] = value
        updated.photo_visible = visible
      }
      return updated
    })
  }

  // Upload image to Supabase storage
  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("report-images")
      .upload(path, file, { upsert: true })

    if (error) {
      console.error("Upload error:", error)
      return null
    }

    const { data: urlData } = supabase.storage
      .from("report-images")
      .getPublicUrl(data.path)

    return urlData.publicUrl
  }

  const handlePhotoUpload = async (index: number, file: File) => {
    setUploading(index)
    const id = savedId || "draft"
    const path = `report-${id}-photo${index + 1}-${Date.now()}.${file.name.split(".").pop()}`
    const url = await uploadImage(file, path)
    if (url) {
      updatePhoto(index, "url", url)
    } else {
      toast.error("Failed to upload photo")
    }
    setUploading(null)
  }

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true)
    const id = savedId || "draft"
    const path = `report-${id}-logo-${Date.now()}.${file.name.split(".").pop()}`
    const url = await uploadImage(file, path)
    if (url) {
      updateField("logo_url", url)
    } else {
      toast.error("Failed to upload logo")
    }
    setUploadingLogo(false)
  }

  // Save report — returns the saved ID or null on failure
  const doSave = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const payload = {
      customer_name: report.customer_name,
      customer_address: report.customer_address,
      customer_phone: report.customer_phone,
      scope_of_work: report.scope_of_work,
      price_quote: report.price_quote,
      company_name: report.company_name,
      company_email: report.company_email,
      company_phone: report.company_phone,
      logo_url: report.logo_url || null,
      photo_urls: report.photo_urls,
      photo_captions: report.photo_captions,
      photo_visible: report.photo_visible,
      recommendations: report.recommendations,
      material: report.material,
      notes: report.notes,
      worker_name: report.worker_name,
      worker_title: report.worker_title,
      worker_phone: report.worker_phone,
      roof_squares: report.roof_squares,
      roof_pitch: report.roof_pitch,
      measurement_data: report.measurement_data,
      materials_visible: report.materials_visible,
      materials_data: report.materials_data,
      pricing_tiers: report.pricing_tiers,
      deposit_percent: report.deposit_percent,
      estimate_line_items: report.estimate_line_items,
      job_type: report.job_type,
      report_completed: report.report_completed,
      contractor_id: session.user.id,
      status: "Pending",
    }

    if (savedId && savedId !== "new") {
      const { error } = await supabase
        .from("reports")
        .update(payload)
        .eq("id", savedId)

      if (error) {
        toast.error("Error saving: " + error.message)
        return null
      }
      onSaved?.(savedId)
      return savedId
    } else {
      const { data, error } = await supabase
        .from("reports")
        .insert(payload)
        .select("id")
        .single()

      if (error) {
        toast.error("Error creating report: " + error.message)
        return null
      }
      if (data) {
        setSavedId(data.id)
        onSaved?.(data.id)
        return data.id
      }
      return null
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const id = await doSave()
    if (id) toast.success("Estimate saved!")
    setSaving(false)
  }

  const handleSendToCustomer = async () => {
    if (!customerEmail) return
    setSending(true)
    try {
      // Auto-save before sending
      const id = savedId && savedId !== "new" ? savedId : await doSave()
      if (!id) {
        toast.error("Failed to save report before sending")
        setSending(false)
        return
      }
      const res = await authFetch("/api/reports/send-to-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: id, customer_email: customerEmail }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success("Estimate sent to " + customerEmail + "!")
        setShowSendForm(false)
        setCustomerEmail("")
        // Refresh activity timeline
        try {
          const actRes = await authFetch(`/api/reports/${id}/activity`)
          if (actRes.ok) setActivityEvents(await actRes.json())
        } catch {}
      }
    } catch {
      toast.error("Failed to send. Please try again.")
    }
    setSending(false)
  }

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="flex flex-col gap-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Estimate"}
        </button>
        <button
          onClick={() => setShowSaveTemplate(!showSaveTemplate)}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
            showSaveTemplate
              ? "bg-emerald-500/15 text-emerald-600 border border-emerald-700"
              : "border border-border bg-card text-foreground hover:bg-secondary"
          }`}
        >
          <BookTemplate className="h-4 w-4" />
          Save as Template
        </button>
        <button
          onClick={() => { setShowLoadTemplate(!showLoadTemplate); if (!showLoadTemplate) loadTemplateList() }}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
            showLoadTemplate
              ? "bg-blue-500/15 text-blue-600 border border-blue-700"
              : "border border-border bg-card text-foreground hover:bg-secondary"
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          Load Template
        </button>
        {savedId && savedId !== "new" && (
          <>
            <button
              onClick={() => onPreview?.(savedId)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <Eye className="h-4 w-4" />
              Preview / Print
            </button>
            <button
              onClick={async () => {
                setDownloadingPdf(true)
                try {
                  const res = await authFetch(`/api/reports/${savedId}/pdf`)
                  if (!res.ok) throw new Error("PDF generation failed")
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `Proposal-${report.customer_name || "estimate"}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                  toast.success("PDF downloaded!")
                } catch {
                  toast.error("Failed to generate PDF. Please try again.")
                }
                setDownloadingPdf(false)
              }}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {downloadingPdf ? "Generating..." : "Download PDF"}
            </button>
          </>
        )}
        <button
          onClick={() => setShowSendForm(!showSendForm)}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
            showSendForm
              ? "bg-emerald-600 text-white border border-emerald-500"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          <Mail className="h-4 w-4" />
          {savedId && savedId !== "new" ? "Send to Customer" : "Save & Send"}
        </button>
      </div>

      {/* Send to Customer Form */}
      {showSendForm && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <Mail className="h-4 w-4 text-primary shrink-0" />
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="Customer email address"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleSendToCustomer}
            disabled={sending || !customerEmail}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      )}

      {/* Report Activity Timeline */}
      {activityEvents.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3.5 w-3.5" /> Estimate Activity
          </h4>
          <div className="space-y-2">
            {activityEvents.map((evt) => {
              const icon = evt.event_type === "sent" ? <Send className="h-3.5 w-3.5 text-blue-500" />
                : evt.event_type === "opened" ? <Eye className="h-3.5 w-3.5 text-amber-500" />
                : evt.event_type === "interested" ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                : <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              const label = evt.event_type === "sent" ? "Estimate sent"
                : evt.event_type === "opened" ? "Email opened"
                : evt.event_type === "interested" ? "Estimate accepted"
                : evt.event_type
              return (
                <div key={evt.id} className="flex items-center gap-3 text-sm">
                  {icon}
                  <span className="font-medium text-foreground">{label}</span>
                  {evt.recipient_email && <span className="text-muted-foreground">— {evt.recipient_email}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(evt.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                    {new Date(evt.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Save as Template Form */}
      {showSaveTemplate && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <BookTemplate className="h-4 w-4 text-emerald-600 shrink-0" />
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name (e.g. Standard Reroof)"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate || !templateName.trim()}
            className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {savingTemplate ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {/* Load Template Panel */}
      {showLoadTemplate && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <FolderOpen className="h-4 w-4" />
            Your Templates
          </div>
          {loadingTemplates ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates saved yet. Use &quot;Save as Template&quot; to create one.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
                  <button
                    onClick={() => handleLoadTemplate(t.id)}
                    className="flex-1 text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {t.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="ml-3 rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Starter Templates — always visible */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Start — Pre-Built Job Templates</p>
        <div className="flex flex-wrap gap-2">
          {[
            {
              name: "Shingle Tear-Off & Replace",
              icon: "🏠",
              data: {
                job_type: "Roof Replacement",
                scope_of_work: "Complete tear-off of existing roofing materials down to deck.\nInspect and repair any damaged decking (up to 2 sheets included).\nInstall ice & water shield in valleys and at eaves.\nInstall synthetic underlayment on entire roof surface.\nInstall new architectural shingles per manufacturer specifications.\nInstall new ridge cap, starter strip, and drip edge.\nReplace all pipe boots, flashing, and vents.\nInstall ridge vent for improved attic ventilation.\nComplete cleanup, magnetic nail sweep, and haul-away of all debris.\n10-year workmanship warranty included.",
                material: "GAF Timberline HDZ Architectural Shingles",
                recommendations: "We recommend upgrading to GAF Timberline HDZ with the Golden Pledge warranty for lifetime coverage including labor. Consider adding a powered attic fan for improved ventilation and energy savings.",
                deposit_percent: 50,
                pricing_tiers: [
                  { name: "Standard", description: "GAF Timberline HDZ 30-year architectural shingles", price: null },
                  { name: "Premium", description: "GAF Timberline Ultra HD with enhanced wind warranty (130 mph)", price: null },
                  { name: "Elite", description: "GAF Grand Sequoia designer shingles with Golden Pledge warranty", price: null },
                ],
                estimate_line_items: [
                  { description: "Tear-off & disposal (per square)", quantity: 0, unit_price: 75 },
                  { description: "Synthetic underlayment", quantity: 0, unit_price: 45 },
                  { description: "Ice & water shield (valleys/eaves)", quantity: 0, unit_price: 65 },
                  { description: "Architectural shingles — installed (per sq)", quantity: 0, unit_price: 350 },
                  { description: "Ridge cap & starter strip", quantity: 1, unit_price: 450 },
                  { description: "Flashing & pipe boots", quantity: 1, unit_price: 350 },
                  { description: "Drip edge (aluminum)", quantity: 0, unit_price: 4 },
                  { description: "Ridge vent (per LF)", quantity: 0, unit_price: 12 },
                  { description: "Decking repair (per sheet, if needed)", quantity: 0, unit_price: 85 },
                  { description: "Cleanup, nail sweep & haul-away", quantity: 1, unit_price: 500 },
                ],
              },
            },
            {
              name: "Metal Roof Install",
              icon: "🔩",
              data: {
                job_type: "Metal Roof Installation",
                scope_of_work: "Remove existing roofing materials down to deck.\nInspect and repair any damaged decking.\nInstall high-temp synthetic underlayment.\nInstall standing seam metal roofing panels per manufacturer specifications.\nInstall custom-fabricated flashing at all penetrations, walls, and transitions.\nInstall metal ridge cap and drip edge.\nSeal all fasteners and joints.\nComplete cleanup and haul-away of all debris.\n20-year workmanship warranty included.",
                material: "24-gauge standing seam metal panels (Kynar 500 finish)",
                recommendations: "Metal roofing offers 40-70 year lifespan, superior wind resistance (140+ mph), and potential insurance premium reductions. Consider adding snow guards if applicable to your area.",
                deposit_percent: 50,
                pricing_tiers: [
                  { name: "Exposed Fastener", description: "26-gauge ribbed metal panels — economical option", price: null },
                  { name: "Standing Seam", description: "24-gauge concealed fastener panels — premium durability", price: null },
                  { name: "Premium Standing Seam", description: "24-gauge Kynar 500 finish with 40-year paint warranty", price: null },
                ],
                estimate_line_items: [
                  { description: "Tear-off & disposal (per square)", quantity: 0, unit_price: 75 },
                  { description: "High-temp synthetic underlayment", quantity: 0, unit_price: 55 },
                  { description: "Standing seam panels — installed (per sq)", quantity: 0, unit_price: 750 },
                  { description: "Custom flashing fabrication & install", quantity: 1, unit_price: 0 },
                  { description: "Metal ridge cap", quantity: 0, unit_price: 18 },
                  { description: "Metal drip edge", quantity: 0, unit_price: 8 },
                  { description: "Pipe boot flashing (metal)", quantity: 0, unit_price: 125 },
                  { description: "Decking repair (per sheet, if needed)", quantity: 0, unit_price: 85 },
                  { description: "Cleanup & haul-away", quantity: 1, unit_price: 500 },
                ],
              },
            },
            {
              name: "Roof Repair",
              icon: "🔧",
              data: {
                job_type: "Roof Repair",
                scope_of_work: "Identify and repair all damaged or missing shingles in affected area.\nInspect and reseal around all flashing, penetrations, and transitions.\nCheck and reseal any exposed or backed-out nail heads.\nReplace damaged pipe boots or vent covers as needed.\nVerify proper drainage and clear debris from valleys and gutters.\nApply roofing sealant to all vulnerable areas.\nProvide photo documentation of repairs.",
                material: "Matching shingles to existing roof",
                recommendations: "Consider scheduling a full roof inspection to assess overall condition and remaining lifespan. If the roof is over 15 years old, replacement may be more cost-effective than repeated repairs.",
                deposit_percent: 0,
                estimate_line_items: [
                  { description: "Shingle repair/replacement (per area)", quantity: 1, unit_price: 0 },
                  { description: "Flashing repair & sealant", quantity: 1, unit_price: 0 },
                  { description: "Pipe boot replacement (if needed)", quantity: 0, unit_price: 125 },
                  { description: "Valley/transition repair", quantity: 1, unit_price: 0 },
                  { description: "Labor", quantity: 1, unit_price: 0 },
                ],
              },
            },
            {
              name: "Storm Damage / Insurance",
              icon: "⛈️",
              data: {
                job_type: "Storm Damage Repair",
                scope_of_work: "Emergency tarp or temporary repair to prevent further water intrusion.\nFull inspection and photo documentation of all storm damage (roof, gutters, siding, etc.).\nPrepare detailed scope of damage report for insurance claim.\nReplace all damaged shingles, flashing, and vents.\nRepair or replace damaged decking as needed.\nReplace damaged gutters and downspouts as needed.\nCoordinate with insurance adjuster for claim documentation and supplemental requests.\nComplete cleanup and haul-away of all debris.\nMatching materials warranty included.",
                material: "Matching materials to existing roof system",
                recommendations: "We handle the full insurance claim process — from initial inspection to adjuster meeting to supplement filing. Our team will ensure all damage is properly documented and covered. No out-of-pocket beyond your deductible in most cases.",
                deposit_percent: 0,
                pricing_tiers: [
                  { name: "Insurance Claim", description: "Full replacement per insurance scope — deductible only out of pocket", price: null },
                  { name: "Insurance + Upgrade", description: "Insurance scope + upgrade to premium materials (difference out of pocket)", price: null },
                ],
                estimate_line_items: [
                  { description: "Emergency tarp / temporary repair", quantity: 1, unit_price: 250 },
                  { description: "Damage inspection & documentation", quantity: 1, unit_price: 0 },
                  { description: "Shingle replacement (per square)", quantity: 0, unit_price: 350 },
                  { description: "Decking repair (per sheet)", quantity: 0, unit_price: 85 },
                  { description: "Flashing & vent replacement", quantity: 1, unit_price: 0 },
                  { description: "Gutter replacement (per LF)", quantity: 0, unit_price: 12 },
                  { description: "Adjuster meeting & supplement filing", quantity: 1, unit_price: 0 },
                  { description: "Cleanup & haul-away", quantity: 1, unit_price: 500 },
                ],
              },
            },
            {
              name: "Flat Roof / Commercial",
              icon: "🏢",
              data: {
                job_type: "Flat Roof Installation",
                scope_of_work: "Remove existing roofing membrane and insulation.\nInspect and repair roof deck as needed.\nInstall tapered insulation system for proper drainage.\nInstall TPO/EPDM single-ply membrane per manufacturer specifications.\nFlash all penetrations, curbs, and wall transitions.\nInstall new scuppers, drains, or overflow drains as specified.\nInstall new coping cap or edge metal.\nPerform flood test to verify watertight installation.\n15-year manufacturer warranty + 10-year workmanship warranty.",
                material: "60-mil TPO single-ply membrane",
                recommendations: "Consider a white TPO membrane for energy savings through solar reflectivity. Adding R-30 insulation can qualify for energy efficiency tax credits.",
                deposit_percent: 40,
                pricing_tiers: [
                  { name: "EPDM Rubber", description: "45-mil EPDM — proven, economical flat roof system", price: null },
                  { name: "TPO", description: "60-mil TPO — energy efficient, heat-welded seams", price: null },
                  { name: "PVC", description: "60-mil PVC — chemical resistant, premium durability", price: null },
                ],
                estimate_line_items: [
                  { description: "Tear-off & disposal", quantity: 0, unit_price: 3 },
                  { description: "Tapered insulation system (per sq ft)", quantity: 0, unit_price: 4 },
                  { description: "TPO membrane — installed (per sq ft)", quantity: 0, unit_price: 8 },
                  { description: "Penetration flashing (each)", quantity: 0, unit_price: 175 },
                  { description: "Wall transition flashing (per LF)", quantity: 0, unit_price: 22 },
                  { description: "Edge metal / coping (per LF)", quantity: 0, unit_price: 18 },
                  { description: "Drain / scupper installation", quantity: 0, unit_price: 350 },
                  { description: "Cleanup & haul-away", quantity: 1, unit_price: 500 },
                ],
              },
            },
            {
              name: "Roof Inspection",
              icon: "🔍",
              data: {
                job_type: "Roof Inspection",
                scope_of_work: "Complete visual inspection of all roofing components.\nInspect shingles/membrane for damage, wear, curling, or missing pieces.\nInspect flashing at all walls, chimneys, vents, and penetrations.\nCheck ridge caps, hip caps, and rake edges.\nInspect valleys for proper drainage and wear.\nCheck pipe boots and vent covers for cracks or deterioration.\nInspect gutters and downspouts for proper attachment and drainage.\nCheck attic for ventilation, moisture, and structural concerns.\nProvide detailed photo documentation with annotations.\nDeliver written inspection report with findings and recommendations.",
                material: "N/A — inspection only",
                recommendations: "A professional roof inspection should be conducted annually and after major storms. This report can be used for insurance documentation, real estate transactions, or maintenance planning.",
                deposit_percent: 0,
                pricing_tiers: [
                  { name: "Standard Inspection", description: "Visual exterior inspection with photo report", price: null },
                  { name: "Full Inspection", description: "Exterior + attic interior + moisture scan", price: null },
                ],
                estimate_line_items: [
                  { description: "Roof inspection fee", quantity: 1, unit_price: 0 },
                  { description: "Written report with photos", quantity: 1, unit_price: 0 },
                  { description: "Attic inspection (if selected)", quantity: 0, unit_price: 75 },
                  { description: "Moisture/infrared scan (if selected)", quantity: 0, unit_price: 150 },
                ],
              },
            },
          ].map((template) => (
            <button
              key={template.name}
              onClick={() => {
                setReport((prev) => ({
                  ...prev,
                  ...template.data,
                }))
                toast.success(`"${template.name}" template loaded`)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary hover:border-primary/30 transition-colors"
            >
              <span>{template.icon}</span>
              {template.name}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-[10px] text-muted-foreground">Click any template to pre-fill scope of work, line items, pricing tiers & materials. Customize pricing to match your rates.</p>
      </div>

      {/* Report Preview — Edit Mode */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Green accent bar */}
        <div className="h-2 bg-primary" />

        <div className="p-5 sm:p-8">
          {/* Header — Company Info */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              {/* Logo */}
              <div className="mb-3">
                {report.logo_url ? (
                  <div className="relative inline-block">
                    <img
                      src={report.logo_url}
                      alt="Company logo"
                      className="h-16 max-w-[200px] object-contain"
                    />
                    <button
                      onClick={() => updateField("logo_url", "")}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingLogo ? "Uploading..." : "Upload Company Logo (optional)"}
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleLogoUpload(file)
                  }}
                />
              </div>

              <input
                value={report.company_name}
                onChange={(e) => updateField("company_name", e.target.value)}
                placeholder="Company Name"
                className="mb-1 block w-full text-xl font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:ring-0"
              />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={report.company_email}
                    onChange={(e) => updateField("company_email", e.target.value)}
                    placeholder="company@email.com"
                    className="text-sm text-muted-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/40 focus:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={report.company_phone}
                    onChange={(e) => updateField("company_phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    className="text-sm text-muted-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/40 focus:ring-0"
                  />
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-lg font-bold text-primary">ROOF ESTIMATE</p>
              <div className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
                {savedId && savedId !== "new" && (
                  <div className="flex items-center justify-end gap-2">
                    <Hash className="h-3.5 w-3.5" />
                    <span>{savedId.slice(0, 8).toUpperCase()}</span>
                  </div>
                )}
                <div className="flex items-center justify-end gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{today}</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="mb-6 border-border" />

          {/* Property Info */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
              <Building2 className="h-4 w-4" />
              Property Information
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Customer Name</label>
                <input
                  value={report.customer_name}
                  onChange={(e) => updateField("customer_name", e.target.value)}
                  placeholder="John Smith"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
                <input
                  value={report.customer_phone}
                  onChange={(e) => updateField("customer_phone", e.target.value)}
                  placeholder="(555) 987-6543"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
                <input
                  value={report.customer_address}
                  onChange={(e) => updateField("customer_address", e.target.value)}
                  placeholder="123 Main St, City, State 12345"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Job Type</label>
                <input
                  value={report.job_type}
                  onChange={(e) => updateField("job_type", e.target.value)}
                  placeholder="Full Roof Replacement"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Roof Details */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
              <Wrench className="h-4 w-4" />
              Roof Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-secondary/20 p-4 text-center">
                <p className="mb-1 text-xs text-muted-foreground">Total Squares</p>
                <input
                  type="number"
                  value={report.roof_squares ?? ""}
                  onChange={(e) => updateField("roof_squares", e.target.value ? Number(e.target.value) : null)}
                  placeholder="—"
                  className="w-full text-center text-2xl font-bold text-foreground bg-transparent border-none outline-none focus:ring-0"
                />
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4 text-center">
                <p className="mb-1 text-xs text-muted-foreground">Pitch</p>
                <input
                  value={report.roof_pitch}
                  onChange={(e) => updateField("roof_pitch", e.target.value)}
                  placeholder="6/12"
                  className="w-full text-center text-2xl font-bold text-foreground bg-transparent border-none outline-none focus:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Edge Measurements */}
          {report.measurement_data?.edge_totals && Object.keys(report.measurement_data.edge_totals).length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
                <Ruler className="h-4 w-4" />
                Edge Measurements
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(report.measurement_data.edge_totals as Record<string, number>)
                  .filter(([, ft]) => ft > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, ft]) => (
                    <div key={type} className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-3 py-2">
                      <span className="text-xs font-medium text-muted-foreground capitalize">{type.replace("_", " ")}</span>
                      <span className="text-sm font-bold text-foreground">{Math.round(ft)} ft</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Materials Calculator */}
          {report.measurement_data?.edge_totals && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
                  <Calculator className="h-4 w-4" />
                  Materials Estimate
                </h3>
                <button
                  onClick={() => updateField("materials_visible", !report.materials_visible)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {report.materials_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {report.materials_visible ? "Visible on report" : "Hidden on report"}
                </button>
              </div>
              {(() => {
                const et = report.measurement_data.edge_totals as Record<string, number>
                const squares = report.roof_squares || report.measurement_data.order_squares || 0
                const eavesLf = et.eaves || 0
                const rakesLf = et.rakes || 0
                const ridgesLf = et.ridges || 0
                const valleysLf = et.valleys || 0
                const hipsLf = et.hips || 0

                const md = (report.materials_data || {}) as Record<string, any>
                const isVisible = (key: string) => md[`${key}_visible`] !== false
                const setMaterialField = (key: string, field: string, value: any) => {
                  updateField("materials_data", { ...md, [`${key}_${field}`]: value })
                }

                const materials = [
                  { key: "shingles", name: "Shingles", qty: Math.ceil(squares * 3), unit: "bundles", autoHide: false },
                  { key: "ridge_caps", name: "Ridge Caps", qty: Math.ceil(ridgesLf / 20), unit: "bundles", autoHide: ridgesLf === 0 },
                  { key: "hip_ridge", name: "Hip & Ridge", qty: Math.ceil(hipsLf / 20), unit: "bundles", autoHide: hipsLf === 0 },
                  { key: "drip_edge", name: "Drip Edge", qty: Math.ceil((eavesLf + rakesLf) / 10), unit: "pieces", autoHide: false },
                  { key: "ice_water", name: "Ice & Water Shield", qty: Math.ceil(eavesLf / 66), unit: "rolls", autoHide: false },
                  { key: "starter", name: "Starter Strip", qty: Math.ceil(eavesLf / 120), unit: "rolls", autoHide: false },
                  { key: "valley_metal", name: "Valley Metal", qty: Math.ceil(valleysLf / 10), unit: "pieces", autoHide: valleysLf === 0 },
                  { key: "underlayment", name: "Underlayment", qty: Math.ceil(squares / 4), unit: "rolls", autoHide: false },
                  { key: "nails", name: "Nails (coil)", qty: Math.ceil(squares / 3), unit: "boxes", autoHide: false },
                ]

                const handleExportMaterials = () => {
                  const visibleMaterials = materials.filter((m) => !m.autoHide && isVisible(m.key))
                  const printWindow = window.open("", "_blank")
                  if (!printWindow) return
                  printWindow.document.write(`
                    <html><head><title>Material Order List</title>
                    <style>
                      body { font-family: Arial, sans-serif; max-width: 700px; margin: 20px auto; padding: 20px; color: #111; }
                      h1 { font-size: 20px; margin: 0 0 5px; }
                      .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
                      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                      th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
                      th { background: #f5f5f5; font-weight: 600; }
                      .qty { text-align: right; font-weight: bold; }
                      @media print { body { margin: 0; } }
                    </style></head><body>
                    <h1>Material Order List</h1>
                    <div class="meta">
                      ${report.customer_address ? `<div>Job: ${report.customer_address}</div>` : ""}
                      <div>Date: ${new Date().toLocaleDateString()}</div>
                      ${report.company_name ? `<div>From: ${report.company_name}</div>` : ""}
                    </div>
                    <table>
                      <thead><tr><th>Material</th><th>Specs</th><th style="text-align:right">Qty</th><th>Unit</th></tr></thead>
                      <tbody>
                        ${visibleMaterials.map((m) => `<tr>
                          <td>${m.name}</td>
                          <td>${md[`${m.key}_specs`] || "—"}</td>
                          <td class="qty">${m.qty}</td>
                          <td>${m.unit}</td>
                        </tr>`).join("")}
                      </tbody>
                    </table>
                    </body></html>
                  `)
                  printWindow.document.close()
                  printWindow.print()
                }

                return (
                  <div>
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-secondary/30">
                            <th className="w-8 px-2 py-2"></th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Material</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Specs</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materials
                            .filter((m) => !m.autoHide)
                            .map((m) => {
                              const visible = isVisible(m.key)
                              return (
                                <tr key={m.key} className={`border-b border-border/50 last:border-0 ${!visible ? "opacity-40" : ""}`}>
                                  <td className="px-2 py-2 text-center">
                                    <button
                                      onClick={() => setMaterialField(m.key, "visible", !visible)}
                                      className="text-muted-foreground hover:text-foreground"
                                      title={visible ? "Hide from report" : "Show on report"}
                                    >
                                      {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 font-medium text-foreground">{m.name}</td>
                                  <td className="px-3 py-2">
                                    <input
                                      value={md[`${m.key}_specs`] || ""}
                                      onChange={(e) => setMaterialField(m.key, "specs", e.target.value)}
                                      placeholder="Brand, color, style..."
                                      className="w-full bg-transparent text-sm text-foreground border-none outline-none placeholder:text-muted-foreground/50 focus:ring-0"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-foreground">{m.qty}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{m.unit}</td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                    <button
                      onClick={handleExportMaterials}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Export Material List
                    </button>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Property Photos */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
              <ImageIcon className="h-4 w-4" />
              Property Photos
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className={!report.photo_visible[idx] ? "opacity-40" : ""}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Photo {idx + 1}</span>
                    <button
                      onClick={() => updatePhoto(idx, "visible", !report.photo_visible[idx])}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {report.photo_visible[idx] ? (
                        <>
                          <Eye className="h-3 w-3" />
                          Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Hidden
                        </>
                      )}
                    </button>
                  </div>

                  {report.photo_urls[idx] ? (
                    <div className="relative">
                      <img
                        src={report.photo_urls[idx]}
                        alt={report.photo_captions[idx] || `Photo ${idx + 1}`}
                        className="h-48 w-full rounded-xl border border-border object-cover"
                      />
                      <button
                        onClick={() => updatePhoto(idx, "url", "")}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRefs.current[idx]?.click()}
                      disabled={uploading === idx}
                      className="flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      {uploading === idx ? "Uploading..." : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-6 w-6" />
                          <span className="text-xs">Click to upload</span>
                        </div>
                      )}
                    </button>
                  )}
                  <input
                    ref={(el) => { fileInputRefs.current[idx] = el }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handlePhotoUpload(idx, file)
                    }}
                  />
                  <input
                    value={report.photo_captions[idx]}
                    onChange={(e) => updatePhoto(idx, "caption", e.target.value)}
                    placeholder="Photo caption (optional)"
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Scope of Work */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
              <FileText className="h-4 w-4" />
              Scope of Work
            </h3>
            <textarea
              value={report.scope_of_work}
              onChange={(e) => updateField("scope_of_work", e.target.value)}
              placeholder="Describe the scope of work..."
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Recommendations */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="mb-3 flex w-full items-center justify-between text-sm font-bold uppercase tracking-wider text-primary"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Recommendations
              </span>
              {showRecommendations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showRecommendations && (
              <textarea
                value={report.recommendations}
                onChange={(e) => updateField("recommendations", e.target.value)}
                placeholder="Professional recommendations..."
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            )}
          </div>

          {/* Line Items */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
                <Calculator className="h-4 w-4" />
                Line Items (Itemized Breakdown)
              </h3>
              <button
                onClick={() => {
                  if (report.estimate_line_items) {
                    updateField("estimate_line_items", null)
                    setShowLineItems(false)
                  } else {
                    updateField("estimate_line_items", [{ description: "", quantity: 1, unit_price: 0 }])
                    setShowLineItems(true)
                  }
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {report.estimate_line_items ? "Remove line items" : "Add line items"}
              </button>
            </div>
            {report.estimate_line_items && (
              <div className="space-y-2">
                {/* Auto-calculate from squares */}
                {report.roof_squares && (
                  <button
                    onClick={() => {
                      const sqft = (report.roof_squares || 0) * 100
                      const items: EstimateLineItem[] = [
                        { description: "Tear-off & disposal of existing roof", quantity: report.roof_squares || 0, unit_price: 75 },
                        { description: "Underlayment (synthetic felt)", quantity: report.roof_squares || 0, unit_price: 25 },
                        { description: "Shingles — installed", quantity: report.roof_squares || 0, unit_price: 250 },
                        { description: "Ridge cap & starter strip", quantity: 1, unit_price: Math.round(sqft * 0.5) },
                        { description: "Flashing & pipe boots", quantity: 1, unit_price: 350 },
                        { description: "Drip edge (aluminum)", quantity: Math.round(sqft / 100 * 10), unit_price: 12 },
                        { description: "Cleanup & haul-away", quantity: 1, unit_price: 500 },
                      ]
                      updateField("estimate_line_items", items)
                      const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
                      updateField("price_quote", total)
                    }}
                    className="mb-2 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Calculator className="h-3.5 w-3.5" />
                    Auto-calculate from {report.roof_squares} squares
                  </button>
                )}

                <div className="rounded-xl border border-border overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_60px_90px_80px_30px] gap-2 bg-secondary/50 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                    <span>Description</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Unit Price</span>
                    <span className="text-right">Amount</span>
                    <span></span>
                  </div>
                  {/* Rows */}
                  {report.estimate_line_items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_60px_90px_80px_30px] gap-2 border-t border-border px-3 py-2 items-center">
                      <input
                        value={item.description}
                        onChange={(e) => {
                          const items = [...report.estimate_line_items!]
                          items[i] = { ...items[i], description: e.target.value }
                          updateField("estimate_line_items", items)
                        }}
                        placeholder="Description"
                        className="text-sm bg-transparent border-none outline-none text-foreground"
                      />
                      <input
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) => {
                          const items = [...report.estimate_line_items!]
                          items[i] = { ...items[i], quantity: Number(e.target.value) || 0 }
                          updateField("estimate_line_items", items)
                        }}
                        className="text-sm text-center bg-transparent border-none outline-none text-foreground w-full"
                      />
                      <div className="flex items-center justify-end gap-0.5">
                        <span className="text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={item.unit_price || ""}
                          onChange={(e) => {
                            const items = [...report.estimate_line_items!]
                            items[i] = { ...items[i], unit_price: Number(e.target.value) || 0 }
                            updateField("estimate_line_items", items)
                          }}
                          className="text-sm text-right bg-transparent border-none outline-none text-foreground w-full"
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground text-right">
                        ${(item.quantity * item.unit_price).toLocaleString()}
                      </span>
                      <button
                        onClick={() => {
                          const items = report.estimate_line_items!.filter((_, j) => j !== i)
                          updateField("estimate_line_items", items.length ? items : null)
                        }}
                        className="text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {/* Add row + Total */}
                  <div className="border-t border-border px-3 py-2 flex items-center justify-between">
                    <button
                      onClick={() => {
                        const items = [...(report.estimate_line_items || []), { description: "", quantity: 1, unit_price: 0 }]
                        updateField("estimate_line_items", items)
                      }}
                      className="text-xs text-primary hover:text-primary/80 font-semibold"
                    >
                      + Add Line Item
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Total</span>
                      <span className="text-lg font-bold text-foreground">
                        ${report.estimate_line_items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0).toLocaleString()}
                      </span>
                      <button
                        onClick={() => {
                          const total = report.estimate_line_items!.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
                          updateField("price_quote", total)
                          toast.success("Price updated from line items")
                        }}
                        className="text-[10px] text-primary hover:underline font-medium"
                      >
                        Set as estimate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Estimated Cost */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
              <DollarSign className="h-4 w-4" />
              Estimated Cost
            </h3>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <span className="text-lg text-muted-foreground">$</span>
                <input
                  type="number"
                  value={report.price_quote ?? ""}
                  onChange={(e) => updateField("price_quote", e.target.value ? Number(e.target.value) : null)}
                  placeholder="0.00"
                  className="flex-1 text-3xl font-bold text-foreground bg-transparent border-none outline-none focus:ring-0"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Estimate valid for 30 days from the date above.</p>
            </div>
          </div>

          {/* Pricing Tiers */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
                <DollarSign className="h-4 w-4" />
                Pricing Options (Good / Better / Best)
              </h3>
              <button
                onClick={() => {
                  if (report.pricing_tiers) {
                    updateField("pricing_tiers", null)
                  } else {
                    updateField("pricing_tiers", [
                      { name: "Good", description: "", price: null },
                      { name: "Better", description: "", price: null },
                      { name: "Best", description: "", price: null },
                    ])
                  }
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {report.pricing_tiers ? "Remove tiers" : "Add tiers"}
              </button>
            </div>
            {report.pricing_tiers && (
              <div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {report.pricing_tiers.map((tier, i) => (
                    <div key={i} className={`rounded-xl border p-4 ${i === 1 ? "border-primary bg-primary/5" : "border-border"}`}>
                      <input
                        value={tier.name}
                        onChange={(e) => {
                          const tiers = [...report.pricing_tiers!]
                          tiers[i] = { ...tiers[i], name: e.target.value }
                          updateField("pricing_tiers", tiers)
                        }}
                        placeholder="Tier name"
                        className="mb-2 w-full text-sm font-bold text-foreground bg-transparent border-none outline-none"
                      />
                      <textarea
                        value={tier.description}
                        onChange={(e) => {
                          const tiers = [...report.pricing_tiers!]
                          tiers[i] = { ...tiers[i], description: e.target.value }
                          updateField("pricing_tiers", tiers)
                        }}
                        placeholder="Description (e.g. 3-tab shingles, 25yr warranty)"
                        rows={2}
                        className="mb-2 w-full resize-none text-xs text-muted-foreground bg-transparent border-none outline-none"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={tier.price ?? ""}
                          onChange={(e) => {
                            const tiers = [...report.pricing_tiers!]
                            tiers[i] = { ...tiers[i], price: e.target.value ? Number(e.target.value) : null }
                            updateField("pricing_tiers", tiers)
                          }}
                          placeholder="0"
                          className="w-full text-lg font-bold text-foreground bg-transparent border-none outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Deposit %:</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={report.deposit_percent ?? ""}
                    onChange={(e) => updateField("deposit_percent", e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="10"
                    className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Material */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowMaterial(!showMaterial)}
              className="mb-3 flex w-full items-center justify-between text-sm font-bold uppercase tracking-wider text-primary"
            >
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Material
              </span>
              {showMaterial ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showMaterial && (
              <input
                value={report.material}
                onChange={(e) => updateField("material", e.target.value)}
                placeholder="e.g. GAF Timberline HDZ, Charcoal"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className="mb-3 flex w-full items-center justify-between text-sm font-bold uppercase tracking-wider text-primary"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </span>
              {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showNotes && (
              <textarea
                value={report.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Additional notes (dumpster included, permit fees, etc.)"
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            )}
          </div>

          <hr className="mb-6 border-border" />

          {/* Prepared By */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
              <User className="h-4 w-4" />
              Prepared By
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
                <input
                  value={report.worker_name}
                  onChange={(e) => updateField("worker_name", e.target.value)}
                  placeholder="Worker name"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Title / Role</label>
                <input
                  value={report.worker_title}
                  onChange={(e) => updateField("worker_title", e.target.value)}
                  placeholder="Sales Rep"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
                <input
                  value={report.worker_phone}
                  onChange={(e) => updateField("worker_phone", e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
