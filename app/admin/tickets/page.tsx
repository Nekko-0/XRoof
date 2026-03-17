"use client"

import { useEffect, useState } from "react"
import { authFetch } from "@/lib/auth-fetch"
import Link from "next/link"
import {
  ArrowLeft, Inbox, Clock, CheckCircle2, AlertCircle,
  Send, ChevronDown, ChevronRight, Timer,
} from "lucide-react"

type Reply = {
  id: string
  sender: string
  body: string
  created_at: string
}

type Ticket = {
  id: string
  subject: string
  contractor_name: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "open" | "in_progress" | "resolved"
  created_at: string
  last_reply_preview: string
  replies: Reply[]
}

type Stats = {
  open: number
  in_progress: number
  resolved: number
  avg_response_time: string
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/15 text-red-400 border-red-500/30",
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  in_progress: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  resolved: "bg-muted text-muted-foreground border-border",
}

type Filter = "all" | "open" | "in_progress" | "resolved"

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<Stats>({ open: 0, in_progress: 0, resolved: 0, avg_response_time: "—" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)

  const fetchTickets = () => {
    authFetch("/api/admin/tickets")
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(data => {
        setTickets(data.tickets || [])
        setStats(data.stats || { open: 0, in_progress: 0, resolved: 0, avg_response_time: "—" })
      })
      .catch(() => setError("Failed to load tickets"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTickets() }, [])

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter)

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) return
    setSending(true)
    try {
      const res = await authFetch(`/api/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText }),
      })
      if (!res.ok) throw new Error()
      setReplyText("")
      fetchTickets()
    } catch {
      setError("Failed to send reply")
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const res = await authFetch(`/api/admin/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      fetchTickets()
    } catch {
      setError("Failed to update status")
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" /></div>
  if (error && tickets.length === 0) return <p className="p-6 text-red-400">{error}</p>

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <Link href="/admin/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 p-6 shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>Support Tickets</h2>
        <p className="mt-1 text-sm text-indigo-100">Manage contractor support requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900/30 text-emerald-400"><Inbox className="h-4 w-4" /></div>
          <p className="mt-2 text-xl font-bold text-foreground">{stats.open}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Open</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-900/30 text-indigo-400"><Clock className="h-4 w-4" /></div>
          <p className="mt-2 text-xl font-bold text-foreground">{stats.in_progress}</p>
          <p className="text-[10px] font-medium text-muted-foreground">In Progress</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/30 text-blue-400"><CheckCircle2 className="h-4 w-4" /></div>
          <p className="mt-2 text-xl font-bold text-foreground">{stats.resolved}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Resolved</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-900/30 text-amber-400"><Timer className="h-4 w-4" /></div>
          <p className="mt-2 text-xl font-bold text-foreground">{stats.avg_response_time}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Avg Response Time</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-secondary/50 p-0.5 w-fit">
        {(["all", "open", "in_progress", "resolved"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-4 py-1.5 text-xs font-medium capitalize transition-colors ${filter === f ? "bg-indigo-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Ticket list */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No tickets found</p>
          </div>
        ) : filtered.map(ticket => (
          <div key={ticket.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Ticket header row */}
            <button
              onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left"
            >
              {expandedId === ticket.id
                ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{ticket.subject}</p>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_COLORS[ticket.priority] || "bg-muted text-muted-foreground border-border"}`}>
                    {ticket.priority}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[ticket.status] || "bg-muted text-muted-foreground border-border"}`}>
                    {ticket.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[10px] text-muted-foreground">{ticket.contractor_name}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
                {ticket.last_reply_preview && (
                  <p className="text-xs text-muted-foreground/70 mt-1 truncate">{ticket.last_reply_preview}</p>
                )}
              </div>
            </button>

            {/* Expanded: conversation thread + reply */}
            {expandedId === ticket.id && (
              <div className="border-t border-border px-4 pb-4">
                {/* Thread */}
                <div className="flex flex-col gap-2 py-4 max-h-80 overflow-y-auto">
                  {(ticket.replies || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No replies yet</p>
                  ) : ticket.replies.map(reply => (
                    <div key={reply.id} className={`rounded-xl p-3 ${reply.sender === "admin" ? "bg-indigo-500/10 border border-indigo-500/20 ml-8" : "bg-secondary/30 mr-8"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold uppercase ${reply.sender === "admin" ? "text-indigo-400" : "text-foreground"}`}>{reply.sender}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(reply.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{reply.body}</p>
                    </div>
                  ))}
                </div>

                {/* Status change */}
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-xs text-muted-foreground">Status:</label>
                  <select
                    value={ticket.status}
                    onChange={e => handleStatusChange(ticket.id, e.target.value)}
                    className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                {/* Reply form */}
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                    className="flex-1 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                  <button
                    onClick={() => handleReply(ticket.id)}
                    disabled={sending || !replyText.trim()}
                    className="flex items-center gap-1.5 self-end rounded-xl bg-indigo-500 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
