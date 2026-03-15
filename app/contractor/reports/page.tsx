"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { useRole } from "@/lib/role-context"
import { FileText, Plus, Send, Eye, CheckCircle, Clock, ExternalLink } from "lucide-react"

type Report = {
  id: string
  customer_name: string
  customer_address: string
  customer_email: string | null
  status: string | null
  created_at: string
  estimate_accepted: boolean
  viewing_token: string | null
  price_quote: number | null
  pricing_tiers: { name: string; price: number }[] | null
}

type ActivityEvent = {
  document_id: string
  event_type: string
  created_at: string
}

export default function ReportsListPage() {
  const { accountId } = useRole()
  const [reports, setReports] = useState<Report[]>([])
  const [activity, setActivity] = useState<Record<string, ActivityEvent[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    const load = async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, customer_name, customer_address, customer_email, status, created_at, estimate_accepted, viewing_token, price_quote, pricing_tiers")
        .eq("contractor_id", accountId)
        .order("created_at", { ascending: false })
        .limit(100)

      const reps = data || []
      setReports(reps)

      // Fetch activity events for all reports
      if (reps.length > 0) {
        const ids = reps.map((r) => r.id)
        const { data: events } = await supabase
          .from("document_events")
          .select("document_id, event_type, created_at")
          .eq("document_type", "report")
          .in("document_id", ids)
          .order("created_at", { ascending: true })

        const map: Record<string, ActivityEvent[]> = {}
        for (const e of events || []) {
          if (!map[e.document_id]) map[e.document_id] = []
          map[e.document_id].push(e)
        }
        setActivity(map)
      }

      setLoading(false)
    }
    load()
  }, [accountId])

  const getStatus = (r: Report) => {
    if (r.estimate_accepted) return { label: "Accepted", color: "text-emerald-500", bg: "bg-emerald-500/10" }
    const events = activity[r.id] || []
    const hasOpened = events.some((e) => e.event_type === "opened")
    const hasSent = events.some((e) => e.event_type === "sent")
    if (hasOpened) return { label: "Viewed", color: "text-blue-500", bg: "bg-blue-500/10" }
    if (hasSent) return { label: "Sent", color: "text-amber-500", bg: "bg-amber-500/10" }
    return { label: "Draft", color: "text-muted-foreground", bg: "bg-secondary" }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  const getPrice = (r: Report) => {
    if (r.pricing_tiers && r.pricing_tiers.length > 0) {
      const prices = r.pricing_tiers.map((t) => t.price).filter(Boolean)
      if (prices.length > 0) return `$${Math.min(...prices).toLocaleString()} - $${Math.max(...prices).toLocaleString()}`
    }
    if (r.price_quote) return `$${Number(r.price_quote).toLocaleString()}`
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>Reports</h1>
          <p className="mt-1 text-xs text-muted-foreground">View and manage your sent estimates and proposals.</p>
        </div>
        <Link
          href="/contractor/report-builder"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Report
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary/50" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No reports yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Create your first estimate to get started.</p>
          <Link href="/contractor/report-builder" className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
            Create Report
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const status = getStatus(r)
            const price = getPrice(r)
            const events = activity[r.id] || []
            return (
              <div key={r.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:bg-secondary/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{r.customer_name || "Unnamed"}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.color} ${status.bg}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{r.customer_address || "No address"}</p>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground/60">
                    <span>{formatDate(r.created_at)}</span>
                    {price && <span className="font-semibold text-foreground/70">{price}</span>}
                    {r.customer_email && <span>{r.customer_email}</span>}
                  </div>
                  {/* Activity timeline */}
                  {events.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      {events.map((e, i) => (
                        <span key={i} className="flex items-center gap-1 text-[10px]">
                          {e.event_type === "sent" && <Send className="h-2.5 w-2.5 text-amber-500" />}
                          {e.event_type === "opened" && <Eye className="h-2.5 w-2.5 text-blue-500" />}
                          {e.event_type === "accepted" && <CheckCircle className="h-2.5 w-2.5 text-emerald-500" />}
                          <span className="text-muted-foreground/50">
                            {e.event_type} {new Date(e.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/contractor/report-builder?id=${r.id}`}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    Edit
                  </Link>
                  {r.viewing_token && (
                    <a
                      href={`/estimate/${r.viewing_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
