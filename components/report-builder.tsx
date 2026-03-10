"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import {
  Save, Eye, Upload, EyeOff, Trash2, ImageIcon, Building2,
  User, MapPin, Phone, Mail, FileText, DollarSign, Wrench,
  MessageSquare, Calendar, Hash, Ruler, Calculator, EyeOff as EyeOffIcon,
  ChevronDown, ChevronUp,
} from "lucide-react"

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
}

interface ReportBuilderProps {
  reportId?: string | null
  onSaved?: (reportId: string) => void
  onPreview?: (reportId: string) => void
}

export function ReportBuilder({ reportId, onSaved, onPreview }: ReportBuilderProps) {
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
        })
        setSavedId(data.id)
      }
    }
    load()
  }, [reportId])

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
      alert("Failed to upload photo")
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
      alert("Failed to upload logo")
    }
    setUploadingLogo(false)
  }

  // Save report
  const handleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setSaving(true)

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
        alert("Error saving: " + error.message)
      } else {
        alert("Report saved!")
        onSaved?.(savedId)
      }
    } else {
      const { data, error } = await supabase
        .from("reports")
        .insert(payload)
        .select("id")
        .single()

      if (error) {
        alert("Error creating report: " + error.message)
      } else if (data) {
        setSavedId(data.id)
        alert("Report created!")
        onSaved?.(data.id)
      }
    }

    setSaving(false)
  }

  const handleSendToCustomer = async () => {
    if (!customerEmail || !savedId || savedId === "new") return
    setSending(true)
    try {
      const res = await fetch("/api/reports/send-to-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: savedId, customer_email: customerEmail }),
      })
      const data = await res.json()
      if (data.error) {
        alert("Error: " + data.error)
      } else {
        alert("Estimate sent to " + customerEmail + "!")
        setShowSendForm(false)
        setCustomerEmail("")
      }
    } catch {
      alert("Failed to send. Please try again.")
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
          {saving ? "Saving..." : "Save Report"}
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
              onClick={() => setShowSendForm(!showSendForm)}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                showSendForm
                  ? "bg-emerald-900/30 text-emerald-400 border border-emerald-700"
                  : "border border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              <Mail className="h-4 w-4" />
              Send to Customer
            </button>
          </>
        )}
      </div>

      {/* Send to Customer Form */}
      {showSendForm && savedId && savedId !== "new" && (
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

                const materials = [
                  { name: "Shingles", qty: Math.ceil(squares * 3), unit: "bundles", note: `${squares.toFixed(1)} squares × 3` },
                  { name: "Ridge Caps", qty: Math.ceil(ridgesLf / 20), unit: "bundles", note: `${Math.round(ridgesLf)} ft ridge` },
                  { name: "Hip & Ridge", qty: Math.ceil(hipsLf / 20), unit: "bundles", note: `${Math.round(hipsLf)} ft hips`, hide: hipsLf === 0 },
                  { name: "Drip Edge", qty: Math.ceil((eavesLf + rakesLf) / 10), unit: "pieces", note: `${Math.round(eavesLf + rakesLf)} ft (eaves + rakes)` },
                  { name: "Ice & Water Shield", qty: Math.ceil(eavesLf / 66), unit: "rolls", note: `${Math.round(eavesLf)} ft eaves` },
                  { name: "Starter Strip", qty: Math.ceil(eavesLf / 120), unit: "rolls", note: `${Math.round(eavesLf)} ft eaves` },
                  { name: "Valley Metal", qty: Math.ceil(valleysLf / 10), unit: "pieces", note: `${Math.round(valleysLf)} ft valleys`, hide: valleysLf === 0 },
                  { name: "Underlayment", qty: Math.ceil(squares / 4), unit: "rolls", note: `${squares.toFixed(1)} squares` },
                  { name: "Nails (coil)", qty: Math.ceil(squares / 3), unit: "boxes", note: `${squares.toFixed(1)} squares` },
                ]

                return (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Material</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Unit</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Based On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials
                          .filter((m) => !m.hide)
                          .map((m) => (
                            <tr key={m.name} className="border-b border-border/50 last:border-0">
                              <td className="px-3 py-2 font-medium text-foreground">{m.name}</td>
                              <td className="px-3 py-2 text-right font-bold text-foreground">{m.qty}</td>
                              <td className="px-3 py-2 text-muted-foreground">{m.unit}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{m.note}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
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
