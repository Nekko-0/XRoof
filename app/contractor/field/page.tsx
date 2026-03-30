"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRole } from "@/lib/role-context"
import { useToast } from "@/lib/toast-context"
import { authFetch, contractorQuery } from "@/lib/auth-fetch"
import { EmptyState } from "@/components/empty-state"
import {
  MapPin, Phone, Camera, Clock, CheckCircle,
  Smartphone, StickyNote, Navigation, Cloud,
  Sun, CloudRain, CloudSnow,
  MessageSquare, Play, MapPinned, ChevronDown,
  ChevronUp, Loader2, ChevronLeft, ChevronRight,
  ClipboardList, AlertTriangle, Receipt, DollarSign, Plus,
} from "lucide-react"

type Job = {
  id: string
  address: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  status: string
  scheduled_date: string | null
  job_type: string
  budget: number | null
}

type Appointment = {
  id: string
  title: string
  date: string
  time: string | null
  type: string
  notes: string | null
  job_id?: string
}

type WorkOrder = {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string | null
  assigned_to: string | null
  assigned_name: string | null
  job_id: string | null
  jobs?: { customer_name: string; address: string } | null
}

type Weather = {
  temp: number
  description: string
  icon: string
}

function getWeekRange(offset: number) {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) + offset * 7)
  monday.setHours(0, 0, 0, 0)

  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  normal: "bg-blue-500",
  low: "bg-gray-500",
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatDayHeader(dateStr: string, today: string) {
  const d = new Date(dateStr + "T12:00:00")
  const dayName = DAY_NAMES[d.getDay()]
  const month = MONTH_NAMES[d.getMonth()]
  const day = d.getDate()
  const isToday = dateStr === today
  return { label: `${dayName}, ${month} ${day}`, isToday }
}

export default function FieldModePage() {
  const { accountId } = useRole()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekJobs, setWeekJobs] = useState<Job[]>([])
  const [activeJobs, setActiveJobs] = useState<Job[]>([])
  const [weekAppts, setWeekAppts] = useState<Appointment[]>([])
  const [weekWorkOrders, setWeekWorkOrders] = useState<WorkOrder[]>([])
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [weather, setWeather] = useState<Weather | null>(null)

  // Quick note
  const [quickNote, setQuickNote] = useState("")
  const [noteJobId, setNoteJobId] = useState<string | null>(null)
  const [savingNote, setSavingNote] = useState(false)

  // Photo capture
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoJobId, setPhotoJobId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // GPS check-in
  const [checkingIn, setCheckingIn] = useState<string | null>(null)

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  // Time tracking
  const [activeTimers, setActiveTimers] = useState<Record<string, { id: string; started_at: string }>>({})
  const [clockingIn, setClockingIn] = useState<string | null>(null)

  // Expenses state
  const [showExpenses, setShowExpenses] = useState(false)
  const [expenses, setExpenses] = useState<{ id: string; amount: number; vendor: string; date: string; category: string; description: string; job_id: string | null; receipt_url: string | null; created_at: string }[]>([])
  const [expenseForm, setExpenseForm] = useState({ amount: "", vendor: "", date: new Date().toISOString().slice(0, 10), category: "materials", description: "", job_id: "" })
  const [savingExpense, setSavingExpense] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const receiptInputRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().slice(0, 10)
  const timeStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  const weekDays = useMemo(() => getWeekRange(weekOffset), [weekOffset])
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]

  useEffect(() => {
    if (!accountId) return
    const load = async () => {
      setLoading(true)

      const [scheduledRes, activeRes, apptsRes, woRes] = await Promise.all([
        contractorQuery("jobs", {
          select: "id, address, customer_name, customer_phone, customer_email, status, scheduled_date, job_type, budget",
          gte: `scheduled_date.${weekStart}`,
          lte: `scheduled_date.${weekEnd}`,
          order: "scheduled_date.asc",
        }),
        contractorQuery("jobs", {
          select: "id, address, customer_name, customer_phone, customer_email, status, scheduled_date, job_type, budget",
          ini: "status.In Progress",
          order: "created_at.desc",
          limit: "10",
        }),
        authFetch(`/api/appointments?contractor_id=${accountId}`).then((r) => r.json()),
        authFetch(`/api/work-orders?contractor_id=${accountId}`).then((r) => r.json()),
      ])

      const scheduled = scheduledRes.data || []
      const active = (activeRes.data || []).filter((j: any) => !scheduled.find((s: any) => s.id === j.id))
      setWeekJobs(scheduled)
      setActiveJobs(active)

      const allAppts = Array.isArray(apptsRes) ? apptsRes : []
      setWeekAppts(allAppts.filter((a: Appointment) => a.date >= weekStart && a.date <= weekEnd))

      const allWo = Array.isArray(woRes) ? woRes : []
      setWeekWorkOrders(allWo.filter((wo: WorkOrder) => wo.due_date && wo.due_date >= weekStart && wo.due_date <= weekEnd && wo.status !== "completed" && wo.status !== "cancelled"))

      // Fetch active time entries
      try {
        const teRes = await authFetch("/api/time-entries?active=true")
        const teData = await teRes.json()
        if (Array.isArray(teData)) {
          const timers: Record<string, { id: string; started_at: string }> = {}
          for (const te of teData) {
            if (te.job_id && !te.ended_at) {
              timers[te.job_id] = { id: te.id, started_at: te.started_at }
            }
          }
          setActiveTimers(timers)
        }
      } catch {}

      // Auto-expand today
      setExpandedDays(new Set([today]))

      // Fetch weather from first job's zip
      const firstAddr = (scheduled[0] || active[0])?.address
      if (firstAddr) {
        const zip = firstAddr.match(/\b(\d{5})\b/)?.[1]
        if (zip) {
          try {
            const wRes = await authFetch(`/api/weather?zip=${zip}`)
            if (wRes.ok) {
              const wData = await wRes.json()
              if (wData.forecast?.[0]) setWeather(wData.forecast[0])
            }
          } catch {}
        }
      }

      setLoading(false)
    }
    load()
  }, [accountId, weekStart, weekEnd, today])

  // Build day data
  const dayData = useMemo(() => {
    const result: Record<string, { jobs: Job[]; appts: Appointment[]; workOrders: WorkOrder[] }> = {}
    for (const day of weekDays) {
      result[day] = {
        jobs: weekJobs.filter((j) => j.scheduled_date === day),
        appts: weekAppts.filter((a) => a.date === day),
        workOrders: weekWorkOrders.filter((wo) => wo.due_date === day),
      }
    }
    return result
  }, [weekDays, weekJobs, weekAppts, weekWorkOrders])

  const toggleDay = useCallback((day: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }, [])

  // Count total items this week
  const totalWeekItems = weekJobs.length + weekAppts.length + weekWorkOrders.length + activeJobs.length

  // --- Actions ---

  const handleCall = (phone: string) => { window.location.href = `tel:${phone}` }
  const handleText = (phone: string) => { window.location.href = `sms:${phone}` }

  const handleNavigate = (address: string) => {
    const encoded = encodeURIComponent(address)
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes("iphone") || ua.includes("ipad")) {
      window.location.href = `maps://maps.apple.com/?q=${encoded}`
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, "_blank")
    }
  }

  const handleSaveNote = async () => {
    if (!quickNote.trim() || !noteJobId || !accountId) return
    setSavingNote(true)
    try {
      await authFetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: noteJobId,
          activity_type: "note",
          description: quickNote.trim(),
        }),
      })
      toast.success("Note saved")
    } catch {
      toast.error("Failed to save note")
    }
    setQuickNote("")
    setNoteJobId(null)
    setSavingNote(false)
  }

  const handleStatusUpdate = async (jobId: string, newStatus: string) => {
    setUpdatingStatus(jobId)
    const updates: Record<string, any> = { status: newStatus }
    if (newStatus === "Completed") updates.completed_at = new Date().toISOString()

    await supabase.from("jobs").update(updates).eq("id", jobId)

    await authFetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: jobId,
        activity_type: "status_change",
        description: `Status changed to ${newStatus} from field`,
      }),
    }).catch(() => {})

    if (newStatus === "Completed") {
      authFetch("/api/automations/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "job_completed", job_id: jobId, contractor_id: accountId }),
      }).catch(() => {})
    }

    const updateJob = (j: Job) => j.id === jobId ? { ...j, status: newStatus } : j
    setWeekJobs((prev) => prev.map(updateJob))
    setActiveJobs((prev) => prev.map(updateJob))

    toast.success(`Job marked as ${newStatus}`)
    setUpdatingStatus(null)
  }

  const handlePhotoCapture = (jobId: string) => {
    setPhotoJobId(jobId)
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !photoJobId || !accountId) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)")
      return
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
      toast.error("Only image files are supported")
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split(".").pop() || "jpg"
      const fileName = `${photoJobId}-field-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from("job-photos")
        .upload(fileName, file, { contentType: file.type })

      if (uploadErr) {
        toast.error("Upload failed: " + uploadErr.message)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from("job-photos").getPublicUrl(fileName)

      await authFetch("/api/job-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: photoJobId,
          url: urlData.publicUrl,
          caption: "Field photo",
          category: "progress",
        }),
      })

      toast.success("Photo uploaded")
    } catch {
      toast.error("Failed to upload photo")
    }
    setUploading(false)
    setPhotoJobId(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleGPSCheckin = async (jobId: string) => {
    setCheckingIn(jobId)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      })
      const { latitude, longitude } = pos.coords
      await authFetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          activity_type: "checkin",
          description: `Checked in at job site`,
          metadata: { lat: latitude, lng: longitude, time: new Date().toISOString() },
        }),
      })
      toast.success(`Checked in at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
    } catch {
      toast.error("Could not get location. Please enable GPS.")
    }
    setCheckingIn(null)
  }

  const handleClockIn = async (jobId: string) => {
    setClockingIn(jobId)
    try {
      const res = await authFetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clock_in", job_id: jobId }),
      })
      const data = await res.json()
      if (data.id) {
        setActiveTimers((prev) => ({ ...prev, [jobId]: { id: data.id, started_at: data.started_at } }))
        toast.success("Clocked in — timer started")
      } else {
        toast.error(data.error || "Failed to clock in")
      }
    } catch {
      toast.error("Failed to clock in")
    }
    setClockingIn(null)
  }

  const handleClockOut = async (jobId: string) => {
    const timer = activeTimers[jobId]
    if (!timer) return
    setClockingIn(jobId)
    try {
      const res = await authFetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clock_out", entry_id: timer.id }),
      })
      const data = await res.json()
      if (data.id) {
        setActiveTimers((prev) => {
          const next = { ...prev }
          delete next[jobId]
          return next
        })
        const mins = data.duration_minutes || 0
        const h = Math.floor(mins / 60)
        const m = mins % 60
        toast.success(`Clocked out — ${h}h ${m}m logged`)
      } else {
        toast.error(data.error || "Failed to clock out")
      }
    } catch {
      toast.error("Failed to clock out")
    }
    setClockingIn(null)
  }

  // --- Expense handlers ---

  const loadExpenses = useCallback(async () => {
    if (!accountId) return
    try {
      const res = await authFetch(`/api/expenses`)
      const data = await res.json()
      if (Array.isArray(data)) setExpenses(data)
    } catch {}
  }, [accountId])

  useEffect(() => {
    if (showExpenses && accountId) loadExpenses()
  }, [showExpenses, accountId, loadExpenses])

  const handleSaveExpense = async () => {
    if (!expenseForm.amount || !expenseForm.vendor || !accountId) return
    setSavingExpense(true)
    try {
      const res = await authFetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(expenseForm.amount),
          vendor: expenseForm.vendor,
          date: expenseForm.date,
          category: expenseForm.category,
          description: expenseForm.description,
          job_id: expenseForm.job_id || null,
        }),
      })
      if (res.ok) {
        toast.success("Expense saved")
        setExpenseForm({ amount: "", vendor: "", date: today, category: "materials", description: "", job_id: "" })
        loadExpenses()
      } else {
        toast.error("Failed to save expense")
      }
    } catch {
      toast.error("Failed to save expense")
    }
    setSavingExpense(false)
  }

  const handleReceiptCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !accountId) return
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)"); return }
    setUploadingReceipt(true)
    try {
      const ext = file.name.split(".").pop() || "jpg"
      const fileName = `receipt-${accountId}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from("job-photos").upload(fileName, file, { contentType: file.type })
      if (uploadErr) { toast.error("Upload failed"); setUploadingReceipt(false); return }
      const { data: urlData } = supabase.storage.from("job-photos").getPublicUrl(fileName)

      const res = await authFetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 0,
          vendor: "Receipt upload",
          date: today,
          category: "materials",
          description: "Uploaded receipt — edit to add details",
          receipt_url: urlData.publicUrl,
          job_id: null,
        }),
      })
      if (res.ok) {
        toast.success("Receipt uploaded — add details to the expense")
        loadExpenses()
      } else {
        toast.error("Failed to save receipt expense")
      }
    } catch {
      toast.error("Failed to upload receipt")
    }
    setUploadingReceipt(false)
    if (receiptInputRef.current) receiptInputRef.current.value = ""
  }

  const EXPENSE_CATEGORIES = ["materials", "labor", "equipment", "permits", "travel", "other"]

  // --- Render helpers ---

  const weatherIcon = (desc: string) => {
    const d = desc.toLowerCase()
    if (d.includes("rain") || d.includes("drizzle")) return <CloudRain className="h-6 w-6" />
    if (d.includes("snow")) return <CloudSnow className="h-6 w-6" />
    if (d.includes("cloud") || d.includes("overcast")) return <Cloud className="h-6 w-6" />
    return <Sun className="h-6 w-6" />
  }

  const statusActions = (job: Job) => {
    switch (job.status) {
      case "Scheduled":
      case "Accepted":
      case "Estimate Sent":
        return [{ label: "Start Job", status: "In Progress", icon: Play, color: "bg-blue-500" }]
      case "In Progress":
        return [{ label: "Complete", status: "Completed", icon: CheckCircle, color: "bg-emerald-500" }]
      default:
        return [
          { label: "In Progress", status: "In Progress", icon: Play, color: "bg-blue-500" },
          { label: "Complete", status: "Completed", icon: CheckCircle, color: "bg-emerald-500" },
        ]
    }
  }

  const renderJobCard = (job: Job) => {
    const isExpanded = expandedJob === job.id
    const actions = statusActions(job)

    return (
      <div key={job.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <button
          className="w-full text-left p-4 active:bg-secondary/30 transition-colors"
          onClick={() => setExpandedJob(isExpanded ? null : job.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-foreground truncate">{job.customer_name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold text-white flex-shrink-0 ${
                  job.status === "In Progress" ? "bg-blue-500" :
                  job.status === "Scheduled" ? "bg-blue-600" :
                  job.status === "Completed" ? "bg-emerald-500" :
                  "bg-amber-500"
                }`}>{job.status}</span>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 flex-shrink-0" /> {job.address}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {job.job_type}
                </span>
                {job.budget && (
                  <span className="text-[11px] font-bold text-emerald-500">${job.budget.toLocaleString()}</span>
                )}
              </div>
            </div>
            {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {job.customer_phone && (
                <button
                  onClick={() => handleCall(job.customer_phone)}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-emerald-500/10 p-3 text-emerald-600 active:bg-emerald-500/20 transition-colors"
                >
                  <Phone className="h-6 w-6" />
                  <span className="text-[10px] font-bold">Call</span>
                </button>
              )}
              {job.customer_phone && (
                <button
                  onClick={() => handleText(job.customer_phone)}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-blue-500/10 p-3 text-blue-600 active:bg-blue-500/20 transition-colors"
                >
                  <MessageSquare className="h-6 w-6" />
                  <span className="text-[10px] font-bold">Text</span>
                </button>
              )}
              <button
                onClick={() => handleNavigate(job.address)}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-purple-500/10 p-3 text-purple-600 active:bg-purple-500/20 transition-colors"
              >
                <Navigation className="h-6 w-6" />
                <span className="text-[10px] font-bold">Navigate</span>
              </button>
              <button
                onClick={() => handlePhotoCapture(job.id)}
                disabled={uploading}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-amber-500/10 p-3 text-amber-600 active:bg-amber-500/20 transition-colors disabled:opacity-50"
              >
                {uploading && photoJobId === job.id ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Camera className="h-6 w-6" />
                )}
                <span className="text-[10px] font-bold">Photo</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setNoteJobId(noteJobId === job.id ? null : job.id)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                  noteJobId === job.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground active:bg-secondary"
                }`}
              >
                <StickyNote className="h-4 w-4" />
                Note
              </button>
              <button
                onClick={() => handleGPSCheckin(job.id)}
                disabled={checkingIn === job.id}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold text-foreground active:bg-secondary transition-colors disabled:opacity-50"
              >
                {checkingIn === job.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPinned className="h-4 w-4" />
                )}
                GPS
              </button>
              {activeTimers[job.id] ? (
                <button
                  onClick={() => handleClockOut(job.id)}
                  disabled={clockingIn === job.id}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-bold text-red-600 active:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {clockingIn === job.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  Out
                </button>
              ) : (
                <button
                  onClick={() => handleClockIn(job.id)}
                  disabled={clockingIn === job.id}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-600 active:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  {clockingIn === job.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  In
                </button>
              )}
            </div>

            {activeTimers[job.id] && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Timer running since {new Date(activeTimers[job.id].started_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </div>
            )}

            {noteJobId === job.id && (
              <div className="flex gap-2">
                <input
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Type a note..."
                  autoFocus
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveNote()}
                />
                <button
                  onClick={handleSaveNote}
                  disabled={!quickNote.trim() || savingNote}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {savingNote ? "..." : "Save"}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              {actions.map((action) => (
                <button
                  key={action.status}
                  onClick={() => handleStatusUpdate(job.id, action.status)}
                  disabled={updatingStatus === job.id}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl ${action.color} px-4 py-3 text-sm font-bold text-white active:opacity-80 transition-opacity disabled:opacity-50`}
                >
                  {updatingStatus === job.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <action.icon className="h-5 w-5" />
                  )}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- Main Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const weekLabel = (() => {
    const s = new Date(weekStart + "T12:00:00")
    const e = new Date(weekEnd + "T12:00:00")
    if (s.getMonth() === e.getMonth()) {
      return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()} – ${e.getDate()}`
    }
    return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()} – ${MONTH_NAMES[e.getMonth()]} ${e.getDate()}`
  })()

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto pb-4">
      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Header + Weather */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/30 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Smartphone className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                Field Mode
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              <span className="mx-1.5">&middot;</span>
              {timeStr}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                {totalWeekItems} this week
              </span>
            </div>
          </div>
          {weather && (
            <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
              {weatherIcon(weather.description)}
              <span className="text-lg font-bold text-foreground">{Math.round(weather.temp)}°</span>
              <span className="text-[10px] capitalize">{weather.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setWeekOffset((p) => p - 1)}
          className="rounded-xl border border-border bg-background p-2 active:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{weekLabel}</p>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-[11px] text-primary font-semibold"
            >
              Back to this week
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((p) => p + 1)}
          className="rounded-xl border border-border bg-background p-2 active:bg-secondary transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Active In-Progress Jobs (always visible) */}
      {activeJobs.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-600 px-1">
            <Play className="h-3 w-3" /> In Progress
          </h3>
          <div className="flex flex-col gap-3">
            {activeJobs.map(renderJobCard)}
          </div>
        </div>
      )}

      {/* Week Days */}
      {weekDays.map((day) => {
        const { label, isToday } = formatDayHeader(day, today)
        const data = dayData[day]
        const itemCount = data.jobs.length + data.appts.length + data.workOrders.length
        const isOpen = expandedDays.has(day)
        const completedJobs = data.jobs.filter((j) => j.status === "Completed")
        const pendingJobs = data.jobs.filter((j) => j.status !== "Completed")

        if (itemCount === 0 && !isToday) return null

        return (
          <div key={day}>
            <button
              onClick={() => toggleDay(day)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                isToday
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-secondary/30 border border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                  {label}
                </span>
                {isToday && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
                    TODAY
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {itemCount > 0 && (
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {itemCount}
                  </span>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {isOpen && (
              <div className="mt-2 flex flex-col gap-3">
                {/* Appointments */}
                {data.appts.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {data.appts.map((a) => (
                      <div key={a.id} className="flex-shrink-0 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 min-w-[140px]">
                        <p className="text-sm font-bold text-blue-600">{a.time || "TBD"}</p>
                        <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                        <span className="text-[9px] text-muted-foreground capitalize">{a.type.replace("_", " ")}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Work Orders */}
                {data.workOrders.map((wo) => (
                  <div key={wo.id} className="rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex items-start gap-3">
                      <ClipboardList className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground truncate">{wo.title}</p>
                          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white flex-shrink-0 ${PRIORITY_COLORS[wo.priority] || "bg-blue-500"}`}>
                            {wo.priority}
                          </span>
                        </div>
                        {wo.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{wo.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {wo.assigned_name && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPinned className="h-3 w-3" /> {wo.assigned_name}
                            </span>
                          )}
                          {wo.jobs?.address && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {wo.jobs.address}
                            </span>
                          )}
                        </div>
                        {wo.priority === "urgent" && (
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-red-600">
                            <AlertTriangle className="h-3 w-3" /> Urgent
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Scheduled Jobs */}
                {pendingJobs.map(renderJobCard)}

                {/* Completed Jobs */}
                {completedJobs.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {completedJobs.map((j) => (
                      <div key={j.id} className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 opacity-70">
                        <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{j.customer_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{j.address}</p>
                        </div>
                        {j.budget && <span className="text-xs font-bold text-emerald-500">${j.budget.toLocaleString()}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty day */}
                {itemCount === 0 && isToday && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nothing scheduled for today</p>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Expenses Section */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <button
          onClick={() => setShowExpenses(!showExpenses)}
          className="w-full flex items-center justify-between p-4 active:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-foreground">Expenses</span>
          </div>
          {showExpenses ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showExpenses && (
          <div className="border-t border-border p-4 space-y-4">
            {/* Hidden receipt input */}
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleReceiptCapture}
            />

            {/* Snap Receipt button */}
            <button
              onClick={() => receiptInputRef.current?.click()}
              disabled={uploadingReceipt}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary active:bg-primary/10 transition-colors disabled:opacity-50"
            >
              {uploadingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {uploadingReceipt ? "Uploading..." : "Snap Receipt"}
            </button>

            {/* Manual expense form */}
            <div className="space-y-3 rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add Expense</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Vendor</label>
                  <input
                    type="text"
                    value={expenseForm.vendor}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                    placeholder="Home Depot"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Date</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Description</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="Shingles, nails, etc."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Job (optional)</label>
                <select
                  value={expenseForm.job_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, job_id: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">No job selected</option>
                  {[...weekJobs, ...activeJobs].map((j) => (
                    <option key={j.id} value={j.id}>{j.customer_name} — {j.address}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSaveExpense}
                disabled={!expenseForm.amount || !expenseForm.vendor || savingExpense}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {savingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {savingExpense ? "Saving..." : "Add Expense"}
              </button>
            </div>

            {/* Recent expenses list */}
            {expenses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Expenses</p>
                {expenses.slice(0, 10).map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{exp.vendor}</span>
                        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground capitalize">{exp.category}</span>
                      </div>
                      {exp.description && <p className="text-xs text-muted-foreground truncate">{exp.description}</p>}
                      <p className="text-[10px] text-muted-foreground">{exp.date}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {exp.receipt_url && (
                        <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                          <Receipt className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <span className="text-sm font-bold text-foreground">${exp.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
