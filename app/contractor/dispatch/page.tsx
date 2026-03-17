"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRole } from "@/lib/role-context"
import { useToast } from "@/lib/toast-context"
import { EmptyState } from "@/components/empty-state"
import {
  Calendar, ChevronLeft, ChevronRight, Users, MapPin,
  Clock, User, Plus, X, Phone, AlertTriangle,
} from "lucide-react"

type CrewMember = {
  id: string
  invited_name: string
  invited_email: string
  role: string
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
  jobs?: { customer_name: string; address: string; customer_phone?: string } | null
}

type Appointment = {
  id: string
  title: string
  date: string
  time: string | null
  type: string
  notes: string | null
  job_id: string | null
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "border-l-red-500 bg-red-500/5",
  high: "border-l-amber-500 bg-amber-500/5",
  normal: "border-l-blue-500 bg-blue-500/5",
  low: "border-l-gray-500 bg-gray-500/5",
}

const STATUS_DOTS: Record<string, string> = {
  pending: "bg-amber-500",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-gray-500",
}

export default function DispatchPage() {
  const { accountId } = useRole()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1) // Monday
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [view, setView] = useState<"week" | "day">("week")
  const [selectedDay, setSelectedDay] = useState(new Date())

  // Quick assign modal
  const [assignModal, setAssignModal] = useState<{ workOrderId: string; currentAssignee: string | null } | null>(null)

  useEffect(() => {
    if (!accountId) return
    loadData()
  }, [accountId, weekStart])

  const loadData = async () => {
    setLoading(true)
    const endOfWeek = new Date(weekStart)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    const startISO = weekStart.toISOString().slice(0, 10)
    const endISO = endOfWeek.toISOString().slice(0, 10)

    const [crewRes, woRes, apptRes] = await Promise.all([
      supabase
        .from("team_members")
        .select("id, invited_name, invited_email, role")
        .eq("account_id", accountId)
        .eq("status", "active"),
      supabase
        .from("work_orders")
        .select("id, title, description, priority, status, due_date, assigned_to, assigned_name, job_id, jobs(customer_name, address, customer_phone)")
        .eq("contractor_id", accountId)
        .gte("due_date", startISO)
        .lte("due_date", endISO)
        .neq("status", "cancelled")
        .order("due_date", { ascending: true }),
      supabase
        .from("appointments")
        .select("id, title, date, time, type, notes, job_id")
        .eq("contractor_id", accountId)
        .gte("date", startISO)
        .lte("date", endISO)
        .order("time", { ascending: true }),
    ])

    setCrew(crewRes.data || [])
    setWorkOrders((woRes.data || []) as unknown as WorkOrder[])
    setAppointments(apptRes.data || [])
    setLoading(false)
  }

  const navigateWeek = (dir: number) => {
    const newStart = new Date(weekStart)
    newStart.setDate(newStart.getDate() + dir * 7)
    setWeekStart(newStart)
  }

  const goToToday = () => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)
    d.setHours(0, 0, 0, 0)
    setWeekStart(d)
    setSelectedDay(new Date())
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const isToday = (d: Date) => {
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }

  const getDayStr = (d: Date) => d.toISOString().slice(0, 10)

  // Get items for a specific day and crew member
  const getCrewDayItems = (crewId: string | null, date: Date) => {
    const dayStr = getDayStr(date)
    const wo = workOrders.filter((w) =>
      w.due_date === dayStr && (crewId ? w.assigned_to === crewId : !w.assigned_to)
    )
    return wo
  }

  const getDayAppointments = (date: Date) => {
    const dayStr = getDayStr(date)
    return appointments.filter((a) => a.date === dayStr)
  }

  const crewRows = crew.map((c) => ({ id: c.id, name: c.invited_name || c.invited_email, role: c.role }))

  const handleQuickAssign = async (workOrderId: string, crewId: string | null) => {
    const member = crew.find((c) => c.id === crewId)
    const { error } = await supabase
      .from("work_orders")
      .update({
        assigned_to: crewId,
        assigned_name: member?.invited_name || null,
      })
      .eq("id", workOrderId)

    if (error) {
      toast.error("Failed to reassign: " + error.message)
    } else {
      toast.success("Work order reassigned!")
      setAssignModal(null)
      loadData()
    }
  }

  const handleStatusChange = async (workOrderId: string, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === "completed") updates.completed_at = new Date().toISOString()

    const { error } = await supabase
      .from("work_orders")
      .update(updates)
      .eq("id", workOrderId)

    if (error) {
      toast.error("Failed to update: " + error.message)
    } else {
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 animate-pulse rounded-lg bg-accent" />
          <div className="flex gap-2">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-accent" />
            <div className="h-8 w-8 animate-pulse rounded-lg bg-accent" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 h-5 w-32 animate-pulse rounded bg-accent" />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="h-20 w-32 animate-pulse rounded-lg bg-accent" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Crew Dispatch Board
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {crew.length} crew member{crew.length !== 1 ? "s" : ""} &middot; {workOrders.length} work orders this week
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === "week" ? "day" : "week")}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-secondary transition-colors"
          >
            {view === "week" ? "Day View" : "Week View"}
          </button>
          <button
            onClick={goToToday}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-secondary transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => navigateWeek(-1)} className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="text-xs font-semibold text-foreground min-w-[140px] text-center">
              {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <button onClick={() => navigateWeek(1)} className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {crew.length === 0 && workOrders.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Crew Members"
          description="Add team members and create work orders to use the dispatch board."
          actionLabel="Go to Team"
          onAction={() => window.location.href = "/contractor/team"}
        />
      ) : (
        <>
          {/* Appointments row (shared) */}
          {getDayAppointments(view === "day" ? selectedDay : weekDays[0]).length > 0 || true ? (
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Appointments This Week
              </h3>
              <div className="flex flex-wrap gap-2">
                {appointments.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No appointments scheduled</p>
                ) : (
                  appointments.map((a) => (
                    <div key={a.id} className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600">{a.time || "TBD"}</span>
                        <span className="font-semibold text-foreground">{a.title}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(a.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        {a.type !== "site_visit" && ` — ${a.type.replace("_", " ")}`}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {/* Week Grid */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Day headers */}
            <div className="grid border-b border-border" style={{ gridTemplateColumns: `120px repeat(${view === "week" ? 7 : 1}, 1fr)` }}>
              <div className="p-2 border-r border-border bg-secondary/30">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Crew</span>
              </div>
              {(view === "week" ? weekDays : [selectedDay]).map((day) => (
                <div
                  key={getDayStr(day)}
                  className={`p-2 text-center border-r border-border last:border-r-0 ${isToday(day) ? "bg-primary/5" : "bg-secondary/30"}`}
                  onClick={() => { if (view === "week") { setSelectedDay(day); setView("day") } }}
                >
                  <p className={`text-[10px] font-bold uppercase ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p className={`text-sm font-bold ${isToday(day) ? "text-primary" : "text-foreground"}`}>
                    {day.getDate()}
                  </p>
                </div>
              ))}
            </div>

            {/* Crew rows */}
            {crewRows.map((member) => (
              <div
                key={member.id || "unassigned"}
                className="grid border-b border-border last:border-b-0"
                style={{ gridTemplateColumns: `120px repeat(${view === "week" ? 7 : 1}, 1fr)` }}
              >
                {/* Crew name */}
                <div className="p-2 border-r border-border flex items-start gap-2 bg-card">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                    member.id ? "bg-primary" : "bg-gray-500"
                  }`}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-foreground truncate">{member.name}</p>
                    {member.role && <p className="text-[9px] text-muted-foreground capitalize">{member.role}</p>}
                  </div>
                </div>

                {/* Day cells */}
                {(view === "week" ? weekDays : [selectedDay]).map((day) => {
                  const items = getCrewDayItems(member.id, day)
                  return (
                    <div
                      key={getDayStr(day)}
                      className={`p-1.5 border-r border-border last:border-r-0 min-h-[80px] ${
                        isToday(day) ? "bg-primary/[0.02]" : ""
                      }`}
                    >
                      {items.map((wo) => (
                        <div
                          key={wo.id}
                          className={`rounded-lg border-l-2 px-2 py-1.5 mb-1 cursor-pointer hover:opacity-80 transition-opacity ${PRIORITY_COLORS[wo.priority] || PRIORITY_COLORS.normal}`}
                          onClick={() => setAssignModal({ workOrderId: wo.id, currentAssignee: wo.assigned_to })}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOTS[wo.status] || STATUS_DOTS.pending}`} />
                            <p className="text-[10px] font-bold text-foreground truncate">{wo.title}</p>
                          </div>
                          {wo.jobs && (
                            <p className="text-[9px] text-muted-foreground truncate flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              {wo.jobs.customer_name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider">Priority:</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-500" /> Urgent</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-500" /> High</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-blue-500" /> Normal</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-gray-500" /> Low</span>
            <span className="mx-2">|</span>
            <span className="font-semibold uppercase tracking-wider">Status:</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pending</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> In Progress</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Completed</span>
          </div>
        </>
      )}

      {/* Quick Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAssignModal(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Reassign Work Order</h3>
              <button onClick={() => setAssignModal(null)} className="rounded-lg p-1 hover:bg-secondary transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Work order details */}
            {(() => {
              const wo = workOrders.find((w) => w.id === assignModal.workOrderId)
              if (!wo) return null
              return (
                <div className="mb-4 rounded-lg border border-border bg-secondary/30 p-3">
                  <p className="text-xs font-bold text-foreground">{wo.title}</p>
                  {wo.jobs && <p className="text-[10px] text-muted-foreground mt-0.5">{wo.jobs.customer_name} — {wo.jobs.address}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <select
                      value={wo.status}
                      onChange={(e) => handleStatusChange(wo.id, e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-[10px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    {wo.jobs?.customer_phone && (
                      <a href={`tel:${wo.jobs.customer_phone}`} className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                        <Phone className="h-3 w-3" /> Call
                      </a>
                    )}
                  </div>
                </div>
              )
            })()}

            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assign to:</p>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {crew.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleQuickAssign(assignModal.workOrderId, c.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-secondary ${
                    assignModal.currentAssignee === c.id ? "bg-primary/10 border border-primary/30" : "border border-border"
                  }`}
                >
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-white">
                    {c.invited_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold">{c.invited_name || c.invited_email}</span>
                    <span className="text-muted-foreground ml-1 capitalize">({c.role})</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
