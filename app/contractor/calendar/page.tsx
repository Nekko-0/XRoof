"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRole } from "@/lib/role-context"
import { useToast } from "@/lib/toast-context"
import { authFetch } from "@/lib/auth-fetch"
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, X,
  Bell, Zap, Briefcase, CheckCircle, Plus, Clock, Trash2,
  Mail, Phone, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle,
  AlertTriangle, RefreshCw,
} from "lucide-react"

type Job = {
  id: string
  address: string
  customer_name: string
  job_type: string
  status: string
  scheduled_date: string | null
  scheduled_end_date: string | null
}

type Followup = {
  id: string
  job_id: string
  due_date: string
  note: string
  completed: boolean
  jobs?: { customer_name: string; address: string }
}

type AutomationStep = {
  id: string
  job_id: string
  action_type: string
  subject: string | null
  message: string
  scheduled_for: string
  status: string
  jobs?: { customer_name: string; address: string }
}

type Appointment = {
  id: string
  contractor_id: string
  job_id: string | null
  title: string
  date: string
  time: string | null
  type: string
  notes: string | null
}

type WeatherDay = {
  date: string
  temp: number
  description: string
  icon: string
}

const APPT_TYPES = [
  { value: "site_visit", label: "Site Visit" },
  { value: "work_start", label: "Work Start" },
  { value: "inspection", label: "Inspection" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
]

function isBadWeather(w: WeatherDay | undefined): boolean {
  if (!w) return false
  const desc = w.description.toLowerCase()
  return desc.includes("rain") || desc.includes("thunderstorm") || desc.includes("snow") || w.temp > 105 || w.temp < 20
}

function WeatherIcon({ description, className }: { description: string; className?: string }) {
  const c = className || "h-3.5 w-3.5"
  switch (description.toLowerCase()) {
    case "rain": return <CloudRain className={c} />
    case "drizzle": return <CloudDrizzle className={c} />
    case "thunderstorm": return <CloudLightning className={c} />
    case "snow": return <CloudSnow className={c} />
    case "clear": return <Sun className={c} />
    default: return <Cloud className={c} />
  }
}

function dateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches)
    onChange(mql)
    mql.addEventListener("change", onChange as (e: MediaQueryListEvent) => void)
    return () => mql.removeEventListener("change", onChange as (e: MediaQueryListEvent) => void)
  }, [breakpoint])
  return isMobile
}

function getWeekStartForDate(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

export default function CalendarPage() {
  const { accountId } = useRole()
  const toast = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [followups, setFollowups] = useState<Followup[]>([])
  const [automations, setAutomations] = useState<AutomationStep[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [weather, setWeather] = useState<WeatherDay[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [unscheduledJobs, setUnscheduledJobs] = useState<Job[]>([])
  const [scheduling, setScheduling] = useState(false)

  const isMobile = useIsMobile()
  const [weekStart, setWeekStart] = useState(() => getWeekStartForDate(new Date()))

  const prevWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }, [])
  const nextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }, [])

  // Appointment form
  const [showApptForm, setShowApptForm] = useState(false)
  const [apptTitle, setApptTitle] = useState("")
  const [apptTime, setApptTime] = useState("")
  const [apptType, setApptType] = useState("site_visit")
  const [apptNotes, setApptNotes] = useState("")
  const [savingAppt, setSavingAppt] = useState(false)

  // Reschedule dialog state
  const [rescheduleJob, setRescheduleJob] = useState<Job | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleNotify, setRescheduleNotify] = useState(true)
  const [rescheduling, setRescheduling] = useState(false)

  useEffect(() => {
    if (!accountId) return
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      const uid = accountId || session.user.id

      // Parallel data loading
      const [jobsRes, followupsRes, automationsRes, appointmentsRes, profileRes] = await Promise.all([
        supabase.from("jobs")
          .select("id, address, customer_name, job_type, status, scheduled_date, scheduled_end_date")
          .eq("contractor_id", uid)
          .not("status", "eq", "New")
          .order("scheduled_date", { ascending: true }),
        supabase.from("followups")
          .select("id, job_id, due_date, note, completed, jobs(customer_name, address)")
          .eq("user_id", uid)
          .eq("completed", false)
          .order("due_date", { ascending: true }),
        supabase.from("scheduled_automations")
          .select("id, job_id, action_type, subject, message, scheduled_for, status")
          .eq("contractor_id", uid)
          .eq("status", "pending")
          .order("scheduled_for", { ascending: true }),
        authFetch(`/api/appointments?contractor_id=${uid}`).then((r) => r.json()),
        supabase.from("profiles").select("service_zips").eq("id", uid).single(),
      ])

      setJobs(jobsRes.data || [])
      setUnscheduledJobs((jobsRes.data || []).filter((j) => !j.scheduled_date && j.status === "Accepted"))
      setFollowups((followupsRes.data as any) || [])
      setAutomations((automationsRes.data as any) || [])
      setAppointments(Array.isArray(appointmentsRes) ? appointmentsRes : [])

      // Fetch weather
      const zip = profileRes.data?.service_zips?.[0]
      if (zip) {
        try {
          const wRes = await fetch(`/api/weather?zip=${zip}`)
          const wData = await wRes.json()
          setWeather(wData.forecast || [])
        } catch { /* skip */ }
      }

      setLoading(false)
    }
    load()
  }, [accountId])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" })

  const prevMonth = () => { setCurrentMonth(new Date(year, month - 1, 1)); setSelectedDate(null) }
  const nextMonth = () => { setCurrentMonth(new Date(year, month + 1, 1)); setSelectedDate(null) }

  const today = new Date()
  const todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const getEventsForDate = (ds: string) => {
    const dayJobs = jobs.filter((j) => {
      if (!j.scheduled_date) return false
      const start = j.scheduled_date.slice(0, 10)
      const end = j.scheduled_end_date?.slice(0, 10) || start
      return ds >= start && ds <= end
    })
    const dayFollowups = followups.filter((f) => f.due_date?.slice(0, 10) === ds)
    const dayAutomations = automations.filter((a) => a.scheduled_for?.slice(0, 10) === ds)
    const dayAppointments = appointments.filter((a) => a.date?.slice(0, 10) === ds)
    const dayWeather = weather.find((w) => w.date === ds)
    return { dayJobs, dayFollowups, dayAutomations, dayAppointments, dayWeather }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "Scheduled": case "Accepted": return "bg-amber-500"
      case "In Progress": return "bg-blue-500"
      case "Completed": return "bg-emerald-500"
      default: return "bg-gray-400"
    }
  }

  const handleSchedule = async (jobId: string, date: string) => {
    setScheduling(true)
    const { error } = await supabase.from("jobs").update({ scheduled_date: date }).eq("id", jobId)
    if (error) { toast.error("Error: " + error.message) }
    else {
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, scheduled_date: date } : j))
      setUnscheduledJobs((prev) => prev.filter((j) => j.id !== jobId))
    }
    setScheduling(false)
  }

  const handleUnschedule = async (jobId: string) => {
    const { error } = await supabase.from("jobs").update({ scheduled_date: null, scheduled_end_date: null }).eq("id", jobId)
    if (!error) {
      const job = jobs.find((j) => j.id === jobId)
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, scheduled_date: null, scheduled_end_date: null } : j))
      if (job && job.status === "Accepted") setUnscheduledJobs((prev) => [...prev, { ...job, scheduled_date: null, scheduled_end_date: null }])
    }
  }

  const handleCompleteFollowup = async (id: string) => {
    await authFetch("/api/followups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed: true }),
    })
    setFollowups((prev) => prev.filter((f) => f.id !== id))
  }

  const handleAddAppointment = async () => {
    if (!apptTitle.trim() || !selectedDate || !accountId) return
    setSavingAppt(true)
    const res = await authFetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractor_id: accountId,
        title: apptTitle.trim(),
        date: selectedDate,
        time: apptTime || null,
        type: apptType,
        notes: apptNotes.trim() || null,
      }),
    })
    const data = await res.json()
    if (data.id) {
      setAppointments((prev) => [...prev, data])
      setApptTitle("")
      setApptTime("")
      setApptType("site_visit")
      setApptNotes("")
      setShowApptForm(false)
    }
    setSavingAppt(false)
  }

  const handleDeleteAppointment = async (id: string) => {
    await authFetch(`/api/appointments?id=${id}`, { method: "DELETE" })
    setAppointments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleReschedule = async () => {
    if (!rescheduleJob || !rescheduleDate || rescheduling) return
    setRescheduling(true)
    const { error } = await supabase
      .from("jobs")
      .update({ scheduled_date: rescheduleDate })
      .eq("id", rescheduleJob.id)
    if (error) {
      toast.error("Error rescheduling: " + error.message)
    } else {
      setJobs((prev) => prev.map((j) => j.id === rescheduleJob.id ? { ...j, scheduled_date: rescheduleDate } : j))
      toast.success(`Rescheduled ${rescheduleJob.customer_name} to ${new Date(rescheduleDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`)
      // Optionally post portal message
      if (rescheduleNotify) {
        fetch("/api/portal/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: rescheduleJob.id,
            sender: "contractor",
            message: `Your project has been rescheduled to ${new Date(rescheduleDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} due to weather conditions. We'll keep you updated!`,
          }),
        }).catch(() => {})
      }
    }
    setRescheduleJob(null)
    setRescheduleDate("")
    setRescheduling(false)
  }

  // Compute weather alerts for the current week
  const weatherAlertCount = (() => {
    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + 7)
    let count = 0
    for (const j of jobs) {
      if (!j.scheduled_date) continue
      const jDate = j.scheduled_date.slice(0, 10)
      const w = weather.find((wd) => wd.date === jDate)
      if (isBadWeather(w)) {
        const d = new Date(jDate + "T12:00:00")
        if (d >= now && d <= weekEnd) count++
      }
    }
    return count
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : null
  const hasAnyEvents = jobs.some((j) => j.scheduled_date) || appointments.length > 0

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Calendar */}
      <div className="flex-1 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Job Calendar
        </h2>

        {weatherAlertCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-300">{weatherAlertCount} job{weatherAlertCount !== 1 ? "s" : ""} scheduled during bad weather this week</p>
              <p className="text-[11px] text-amber-400/70">Click a day to review and reschedule affected jobs.</p>
            </div>
          </div>
        )}

        {!hasAnyEvents && (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/50 p-4 text-center">
            <CalendarIcon className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No scheduled events yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">Schedule jobs from your pipeline or click a date to add an appointment.</p>
          </div>
        )}

        {/* ─── Mobile Week View ─── */}
        {isMobile ? (
          <>
            {/* Week Navigation */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
              <button onClick={prevWeek} className="rounded-lg p-3 hover:bg-secondary transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="text-sm font-bold text-foreground">
                {(() => {
                  const days = getWeekDays(weekStart)
                  const start = days[0]
                  const end = days[6]
                  const sameMonth = start.getMonth() === end.getMonth()
                  if (sameMonth) {
                    return `${start.toLocaleString("en-US", { month: "short" })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
                  }
                  return `${start.toLocaleString("en-US", { month: "short" })} ${start.getDate()} – ${end.toLocaleString("en-US", { month: "short" })} ${end.getDate()}`
                })()}
              </h3>
              <button onClick={nextWeek} className="rounded-lg p-3 hover:bg-secondary transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Week Grid */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="grid grid-cols-7">
                {getWeekDays(weekStart).map((dayDate) => {
                  const ds = dateStr(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate())
                  const { dayJobs, dayFollowups, dayAutomations, dayAppointments, dayWeather } = getEventsForDate(ds)
                  const isToday = ds === todayStr
                  const isSelected = ds === selectedDate
                  const totalEvents = dayJobs.length + dayFollowups.length + dayAutomations.length + dayAppointments.length
                  const hasBadWeatherJobsMobile = dayJobs.length > 0 && isBadWeather(dayWeather)

                  return (
                    <button
                      key={ds}
                      onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
                      className={`min-h-[80px] flex flex-col items-center gap-1 p-2 border-r last:border-r-0 border-border/50 transition-colors ${
                        isToday ? "bg-primary/10" : ""
                      } ${isSelected ? "ring-2 ring-primary ring-inset" : ""} ${hasBadWeatherJobsMobile ? "bg-red-500/5" : ""}`}
                    >
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        {dayDate.toLocaleString("en-US", { weekday: "short" })}
                      </span>
                      <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        isToday ? "bg-primary text-white" : "text-foreground"
                      } ${isSelected && !isToday ? "bg-primary/20" : ""}`}>
                        {dayDate.getDate()}
                      </span>
                      {hasBadWeatherJobsMobile && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                      {dayWeather && (
                        <span className={`flex items-center gap-0.5 text-[9px] ${hasBadWeatherJobsMobile ? "text-amber-400 font-semibold" : "text-muted-foreground"}`}>
                          <WeatherIcon description={dayWeather.description} className="h-3 w-3" />
                          {dayWeather.temp}°
                        </span>
                      )}
                      {/* Colored dots only on mobile */}
                      {totalEvents > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mt-auto">
                          {dayJobs.length > 0 && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                          {dayFollowups.length > 0 && <span className="h-2 w-2 rounded-full bg-red-400" />}
                          {dayAutomations.length > 0 && <span className="h-2 w-2 rounded-full bg-primary/60" />}
                          {dayAppointments.length > 0 && <span className="h-2 w-2 rounded-full bg-blue-400" />}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Legend (compact on mobile) */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Jobs</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Reminders</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary/60" /> Auto</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> Appts</span>
            </div>
          </>
        ) : (
          <>
            {/* Month Navigation */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
              <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-secondary transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="text-sm font-bold text-foreground">{monthName}</h3>
              <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-secondary transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border/50 bg-secondary/10" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const ds = dateStr(year, month, day)
                  const { dayJobs, dayFollowups, dayAutomations, dayAppointments, dayWeather } = getEventsForDate(ds)
                  const isToday = ds === todayStr
                  const isSelected = ds === selectedDate
                  const totalEvents = dayJobs.length + dayFollowups.length + dayAutomations.length + dayAppointments.length
                  const hasBadWeatherJobs = dayJobs.length > 0 && isBadWeather(dayWeather)

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
                      className={`min-h-[80px] border-b border-r border-border/50 p-1 text-left transition-colors hover:bg-primary/5 ${
                        isToday ? "bg-primary/10" : ""
                      } ${isSelected ? "ring-2 ring-primary ring-inset" : ""} ${hasBadWeatherJobs ? "bg-red-500/5" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {day}
                        </span>
                        <span className="flex items-center gap-0.5">
                          {hasBadWeatherJobs && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                          {dayWeather && (
                            <span className={`flex items-center gap-0.5 text-[9px] ${hasBadWeatherJobs ? "text-amber-400 font-semibold" : "text-muted-foreground"}`}>
                              <WeatherIcon description={dayWeather.description} className="h-3 w-3" />
                              {dayWeather.temp}°
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Event dots */}
                      {totalEvents > 0 && (
                        <div className="mt-0.5 flex gap-0.5">
                          {dayJobs.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                          {dayFollowups.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
                          {dayAutomations.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />}
                          {dayAppointments.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
                        </div>
                      )}

                      {/* Top 2 labels */}
                      <div className="mt-0.5 flex flex-col gap-0.5">
                        {dayJobs.slice(0, 2).map((j) => (
                          <div key={j.id} className={`rounded px-1 py-0.5 text-[9px] font-medium text-white truncate ${statusColor(j.status)}`}>
                            {j.customer_name || j.address}
                          </div>
                        ))}
                        {dayJobs.length === 0 && dayAppointments.slice(0, 1).map((a) => (
                          <div key={a.id} className="rounded bg-blue-500 px-1 py-0.5 text-[9px] font-medium text-white truncate">
                            {a.time ? `${a.time} ` : ""}{a.title}
                          </div>
                        ))}
                        {totalEvents > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{totalEvents - 2} more</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Jobs</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Reminders</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary/60" /> Automations</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> Appointments</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> In Progress</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Completed</span>
            </div>
          </>
        )}
      </div>

      {/* ─── Side Panel ─── */}
      {selectedDate && selectedEvents && (
        <div className={isMobile
          ? "fixed inset-0 z-50 overflow-y-auto bg-background"
          : "w-full lg:w-80 xl:w-96 flex-shrink-0"
        }>
          <div className={isMobile
            ? "min-h-full p-4"
            : "sticky top-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
          }>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h4>
                {selectedEvents.dayWeather && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <WeatherIcon description={selectedEvents.dayWeather.description} className="h-3.5 w-3.5 text-sky-400" />
                    <span>{selectedEvents.dayWeather.temp}°F {selectedEvents.dayWeather.description}</span>
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedDate(null)} className="rounded-lg p-2 min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-secondary md:p-1 md:min-w-0 md:min-h-0">
                <X className="h-5 w-5 text-muted-foreground md:h-4 md:w-4" />
              </button>
            </div>

            {/* Jobs */}
            <div className="mb-4">
              <h5 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Briefcase className="h-3 w-3" /> Jobs ({selectedEvents.dayJobs.length})
              </h5>
              {selectedEvents.dayJobs.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {selectedEvents.dayJobs.map((j) => {
                    const jobHasBadWeather = isBadWeather(selectedEvents.dayWeather)
                    return (
                      <div key={j.id} className={`rounded-lg border px-3 py-2 ${jobHasBadWeather ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-secondary/20"}`}>
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{j.customer_name}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                              <MapPin className="h-2.5 w-2.5 flex-shrink-0" /> {j.address}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2">
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white ${statusColor(j.status)}`}>
                              {j.status}
                            </span>
                            <button onClick={() => handleUnschedule(j.id)} className="text-[10px] text-muted-foreground hover:text-red-400">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        {jobHasBadWeather && (
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                              <AlertTriangle className="h-3 w-3" /> Bad weather
                            </span>
                            <button
                              onClick={() => { setRescheduleJob(j); setRescheduleDate("") }}
                              className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400 hover:bg-amber-500/25 transition-colors"
                            >
                              <RefreshCw className="h-2.5 w-2.5" /> Reschedule
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/60">No jobs</p>
              )}

              {/* Schedule unscheduled job */}
              {unscheduledJobs.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">Schedule a job:</p>
                  {unscheduledJobs.slice(0, 3).map((j) => (
                    <button
                      key={j.id}
                      onClick={() => handleSchedule(j.id, selectedDate)}
                      disabled={scheduling}
                      className="mb-1 flex w-full items-center justify-between rounded-lg border border-dashed border-primary/30 px-2.5 py-1.5 text-left hover:bg-primary/5 transition-colors disabled:opacity-50"
                    >
                      <span className="text-[11px] font-medium text-foreground truncate">{j.customer_name}</span>
                      <CalendarIcon className="h-3 w-3 text-primary flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reminders */}
            <div className="mb-4">
              <h5 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Bell className="h-3 w-3 text-red-400" /> Reminders ({selectedEvents.dayFollowups.length})
              </h5>
              {selectedEvents.dayFollowups.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {selectedEvents.dayFollowups.map((f) => (
                    <div key={f.id} className="flex items-start justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground">{(f.jobs as any)?.customer_name || "Reminder"}</p>
                        {f.note && <p className="text-[10px] text-muted-foreground line-clamp-2">{f.note}</p>}
                      </div>
                      <button
                        onClick={() => handleCompleteFollowup(f.id)}
                        className="ml-2 flex-shrink-0 rounded-md bg-red-500/10 px-2 py-1 text-[9px] font-bold text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/60">No reminders</p>
              )}
            </div>

            {/* Automations */}
            {selectedEvents.dayAutomations.length > 0 && (
              <div className="mb-4">
                <h5 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Zap className="h-3 w-3 text-primary" /> Automations ({selectedEvents.dayAutomations.length})
                </h5>
                <div className="flex flex-col gap-1.5">
                  {selectedEvents.dayAutomations.map((a) => (
                    <div key={a.id} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {a.action_type === "email" ? <Mail className="h-3 w-3 text-blue-400" /> :
                         a.action_type === "sms" ? <Phone className="h-3 w-3 text-emerald-400" /> :
                         <Bell className="h-3 w-3 text-amber-400" />}
                        <span className="font-bold text-foreground capitalize">{a.action_type}</span>
                      </div>
                      {a.subject && <p className="text-[10px] font-semibold text-foreground mt-0.5">{a.subject}</p>}
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{a.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Appointments */}
            <div className="mb-2">
              <h5 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <CalendarIcon className="h-3 w-3 text-blue-400" /> Appointments ({selectedEvents.dayAppointments.length})
              </h5>
              {selectedEvents.dayAppointments.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-2">
                  {selectedEvents.dayAppointments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {a.time && <span className="text-[10px] font-bold text-blue-400">{a.time}</span>}
                          <span className="text-xs font-bold text-foreground truncate">{a.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground capitalize">{a.type.replace("_", " ")}</span>
                      </div>
                      <button onClick={() => handleDeleteAppointment(a.id)} className="ml-2 text-muted-foreground hover:text-red-400">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add appointment form */}
              {showApptForm ? (
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
                  <input
                    value={apptTitle}
                    onChange={(e) => setApptTitle(e.target.value)}
                    placeholder="Title (e.g. Site visit)"
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={apptTime}
                      onChange={(e) => setApptTime(e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none"
                    />
                    <select
                      value={apptType}
                      onChange={(e) => setApptType(e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                    >
                      {APPT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={apptNotes}
                    onChange={(e) => setApptNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddAppointment}
                      disabled={!apptTitle.trim() || savingAppt}
                      className="flex-1 rounded-lg bg-blue-500 py-1.5 text-xs font-bold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      {savingAppt ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setShowApptForm(false)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowApptForm(true)}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-blue-500/30 py-2 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/5 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add Appointment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Dialog */}
      {rescheduleJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-amber-400" /> Reschedule Job
              </h3>
              <button onClick={() => setRescheduleJob(null)} className="rounded-lg p-1 hover:bg-secondary">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="mb-4 rounded-lg border border-border bg-secondary/20 px-3 py-2">
              <p className="text-xs font-bold text-foreground">{rescheduleJob.customer_name}</p>
              <p className="text-[10px] text-muted-foreground">{rescheduleJob.address}</p>
              {rescheduleJob.scheduled_date && (
                <p className="text-[10px] text-amber-400 mt-0.5">
                  Currently: {new Date(rescheduleJob.scheduled_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </p>
              )}
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={todayStr}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <label className="mb-4 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rescheduleNotify}
                onChange={(e) => setRescheduleNotify(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-[11px] text-muted-foreground">Notify homeowner via portal message</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleReschedule}
                disabled={!rescheduleDate || rescheduling}
                className="flex-1 rounded-lg bg-amber-500 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {rescheduling ? "Rescheduling..." : "Reschedule"}
              </button>
              <button
                onClick={() => setRescheduleJob(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
