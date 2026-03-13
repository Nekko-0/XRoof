"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRole } from "@/lib/role-context"
import { useToast } from "@/lib/toast-context"
import { authFetch } from "@/lib/auth-fetch"
import { EmptyState } from "@/components/empty-state"
import {
  MapPin, Phone, Camera, Clock, CheckCircle,
  Smartphone, StickyNote, Navigation, Cloud,
  Sun, CloudRain, CloudSnow, Thermometer,
  MessageSquare, Play, MapPinned, ChevronDown,
  ChevronUp, Loader2, Image,
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

type Weather = {
  temp: number
  description: string
  icon: string
}

export default function FieldModePage() {
  const { accountId } = useRole()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [todayJobs, setTodayJobs] = useState<Job[]>([])
  const [activeJobs, setActiveJobs] = useState<Job[]>([])
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([])
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
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

  const today = new Date().toISOString().slice(0, 10)
  const timeStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

  useEffect(() => {
    if (!accountId) return
    const load = async () => {
      // Fetch today's scheduled jobs + active (non-completed, non-lost) jobs
      const [scheduledRes, activeRes, apptsRes] = await Promise.all([
        supabase.from("jobs")
          .select("id, address, customer_name, customer_phone, customer_email, status, scheduled_date, job_type, budget")
          .eq("contractor_id", accountId)
          .eq("scheduled_date", today)
          .order("created_at", { ascending: true }),
        supabase.from("jobs")
          .select("id, address, customer_name, customer_phone, customer_email, status, scheduled_date, job_type, budget")
          .eq("contractor_id", accountId)
          .in("status", ["In Progress"])
          .order("created_at", { ascending: false })
          .limit(5),
        authFetch(`/api/appointments?contractor_id=${accountId}`).then((r) => r.json()),
      ])

      const scheduled = scheduledRes.data || []
      const active = (activeRes.data || []).filter((j) => !scheduled.find((s) => s.id === j.id))
      setTodayJobs(scheduled)
      setActiveJobs(active)
      setTodayAppts(
        (Array.isArray(apptsRes) ? apptsRes : []).filter((a: any) => a.date === today)
      )

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

      // Auto-expand first active job
      const firstActive = scheduled.find((j) => j.status !== "Completed") || active[0]
      if (firstActive) setExpandedJob(firstActive.id)

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
  }, [accountId, today])

  // --- Actions ---

  const handleCall = (phone: string) => { window.location.href = `tel:${phone}` }
  const handleText = (phone: string) => { window.location.href = `sms:${phone}` }

  const handleNavigate = (address: string) => {
    const encoded = encodeURIComponent(address)
    // Use Google Maps on Android, Apple Maps on iOS, fallback to Google Maps
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

    // Log activity
    await authFetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: jobId,
        activity_type: "status_change",
        description: `Status changed to ${newStatus} from field`,
      }),
    }).catch(() => {})

    // Fire automation if completed
    if (newStatus === "Completed") {
      authFetch("/api/automations/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "job_completed", job_id: jobId, contractor_id: accountId }),
      }).catch(() => {})
    }

    // Update local state
    const updateJob = (j: Job) => j.id === jobId ? { ...j, status: newStatus } : j
    setTodayJobs((prev) => prev.map(updateJob))
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

    // Validate file size and type
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

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const allJobs = [...todayJobs, ...activeJobs]
  const pendingJobs = allJobs.filter((j) => j.status !== "Completed")
  const completedToday = todayJobs.filter((j) => j.status === "Completed")

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
                {pendingJobs.length} active
              </span>
              {completedToday.length > 0 && (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-500">
                  {completedToday.length} done
                </span>
              )}
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

      {/* Today's Schedule */}
      {todayAppts.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
            <Clock className="h-3 w-3" /> Schedule
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {todayAppts.map((a) => (
              <div key={a.id} className="flex-shrink-0 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 min-w-[140px]">
                <p className="text-sm font-bold text-blue-400">{a.time || "TBD"}</p>
                <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                <span className="text-[9px] text-muted-foreground capitalize">{a.type.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Jobs */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
          <MapPin className="h-3 w-3" /> Jobs ({pendingJobs.length})
        </h3>

        {pendingJobs.length === 0 ? (
          <EmptyState
            icon={Smartphone}
            title="No active jobs"
            description="Schedule jobs from the Calendar or Pipeline to see them here."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {pendingJobs.map((job) => {
              const isExpanded = expandedJob === job.id
              const actions = statusActions(job)

              return (
                <div key={job.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  {/* Job Header — tappable */}
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

                  {/* Expanded Actions */}
                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-3">
                      {/* Quick Actions Grid — large touch targets */}
                      <div className="grid grid-cols-4 gap-2">
                        {job.customer_phone && (
                          <button
                            onClick={() => handleCall(job.customer_phone)}
                            className="flex flex-col items-center gap-1.5 rounded-xl bg-emerald-500/10 p-3 text-emerald-400 active:bg-emerald-500/20 transition-colors"
                          >
                            <Phone className="h-6 w-6" />
                            <span className="text-[10px] font-bold">Call</span>
                          </button>
                        )}
                        {job.customer_phone && (
                          <button
                            onClick={() => handleText(job.customer_phone)}
                            className="flex flex-col items-center gap-1.5 rounded-xl bg-blue-500/10 p-3 text-blue-400 active:bg-blue-500/20 transition-colors"
                          >
                            <MessageSquare className="h-6 w-6" />
                            <span className="text-[10px] font-bold">Text</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleNavigate(job.address)}
                          className="flex flex-col items-center gap-1.5 rounded-xl bg-purple-500/10 p-3 text-purple-400 active:bg-purple-500/20 transition-colors"
                        >
                          <Navigation className="h-6 w-6" />
                          <span className="text-[10px] font-bold">Navigate</span>
                        </button>
                        <button
                          onClick={() => handlePhotoCapture(job.id)}
                          disabled={uploading}
                          className="flex flex-col items-center gap-1.5 rounded-xl bg-amber-500/10 p-3 text-amber-400 active:bg-amber-500/20 transition-colors disabled:opacity-50"
                        >
                          {uploading && photoJobId === job.id ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <Camera className="h-6 w-6" />
                          )}
                          <span className="text-[10px] font-bold">Photo</span>
                        </button>
                      </div>

                      {/* Secondary actions */}
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
                            className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-bold text-red-400 active:bg-red-500/20 transition-colors disabled:opacity-50"
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
                            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-400 active:bg-emerald-500/20 transition-colors disabled:opacity-50"
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

                      {/* Active timer indicator */}
                      {activeTimers[job.id] && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                          Timer running since {new Date(activeTimers[job.id].started_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </div>
                      )}

                      {/* Quick Note Input */}
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

                      {/* Status Update Buttons — most prominent */}
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
            })}
          </div>
        )}
      </div>

      {/* Completed Today */}
      {completedToday.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
            <CheckCircle className="h-3 w-3 text-emerald-400" /> Done Today ({completedToday.length})
          </h3>
          <div className="flex flex-col gap-2">
            {completedToday.map((j) => (
              <div key={j.id} className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 opacity-70">
                <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{j.customer_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{j.address}</p>
                </div>
                {j.budget && <span className="text-xs font-bold text-emerald-500">${j.budget.toLocaleString()}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
