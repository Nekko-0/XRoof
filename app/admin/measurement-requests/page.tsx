"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Clock, CheckCircle, Loader2, AlertCircle, MapPin, Zap, ArrowRight } from "lucide-react"

type MeasurementRequest = {
  id: string
  contractor_id: string
  address: string
  roof_type: string
  urgency: string
  notes: string
  status: string
  created_at: string
  delivered_data: any
}

const STATUS_OPTIONS = ["requested", "in_progress", "delivered", "cancelled"] as const

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  requested: { label: "Requested", color: "text-amber-600", bg: "bg-amber-500/20" },
  in_progress: { label: "In Progress", color: "text-blue-600", bg: "bg-blue-500/20" },
  delivered: { label: "Delivered", color: "text-emerald-600", bg: "bg-emerald-500/20" },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-500/20" },
}

export default function AdminMeasurementRequestsPage() {
  const [requests, setRequests] = useState<MeasurementRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }

      const res = await fetch("/api/measurement-requests?all=true")
      const data = await res.json()
      setRequests(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    init()
  }, [])

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await fetch("/api/measurement-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    })
    const data = await res.json()
    if (data.id) {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r))
    }
  }

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Measurement Requests
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage incoming professional measurement requests
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Pending", count: requests.filter((r) => r.status === "requested").length, color: "text-amber-600", bg: "bg-amber-500/15" },
          { label: "In Progress", count: requests.filter((r) => r.status === "in_progress").length, color: "text-blue-600", bg: "bg-blue-500/15" },
          { label: "Delivered", count: requests.filter((r) => r.status === "delivered").length, color: "text-emerald-600", bg: "bg-emerald-500/15" },
          { label: "Total", count: requests.length, color: "text-primary", bg: "bg-primary/10" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-secondary/50 p-1 w-fit">
        {["all", "requested", "in_progress", "delivered"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${filter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {f === "all" ? "All" : STATUS_CONFIG[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Request list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No requests found</p>
        ) : (
          filtered.map((r) => {
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.requested
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm font-bold text-foreground truncate">{r.address}</p>
                      {r.urgency === "rush" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          <Zap className="h-3 w-3" /> Rush
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{r.roof_type}</span>
                      <span>·</span>
                      <span>Contractor: {r.contractor_id.slice(0, 8)}...</span>
                      <span>·</span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.notes && <p className="mt-1 text-xs text-muted-foreground italic">{r.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.color}`}>
                      {sc.label}
                    </span>
                    <select
                      value={r.status}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] text-foreground"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
