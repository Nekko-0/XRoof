"use client"

import { useEffect, useState } from "react"
import { authFetch } from "@/lib/auth-fetch"
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Send,
  AlertCircle,
  Clock,
  CheckCircle2,
  CircleDot,
} from "lucide-react"

type Ticket = {
  id: string
  subject: string
  description: string
  priority: "low" | "medium" | "high"
  status: "open" | "in_progress" | "resolved" | "closed"
  created_at: string
  messages?: TicketMessage[]
}

type TicketMessage = {
  id: string
  body: string
  sender: string
  created_at: string
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-500/15 text-gray-400",
  medium: "bg-amber-500/15 text-amber-400",
  high: "bg-red-500/15 text-red-400",
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  open: { icon: CircleDot, color: "text-blue-400", label: "Open" },
  in_progress: { icon: Clock, color: "text-amber-400", label: "In Progress" },
  resolved: { icon: CheckCircle2, color: "text-emerald-400", label: "Resolved" },
  closed: { icon: CheckCircle2, color: "text-gray-500", label: "Closed" },
}

export default function HelpPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // New ticket form
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [creating, setCreating] = useState(false)

  // Expanded ticket
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reply, setReply] = useState("")
  const [replying, setReplying] = useState(false)

  async function fetchTickets() {
    setLoading(true)
    setError("")
    try {
      const res = await authFetch("/api/tickets")
      if (!res.ok) throw new Error("Failed to load tickets")
      const data = await res.json()
      setTickets(data.tickets || [])
    } catch {
      setError("Could not load tickets. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  async function createTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return
    setCreating(true)
    try {
      const res = await authFetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description, priority }),
      })
      if (!res.ok) throw new Error("Failed to create ticket")
      setSubject("")
      setDescription("")
      setPriority("medium")
      setShowForm(false)
      await fetchTickets()
    } catch {
      setError("Failed to create ticket. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  async function sendReply(ticketId: string) {
    if (!reply.trim()) return
    setReplying(true)
    try {
      const res = await authFetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      })
      if (!res.ok) throw new Error("Failed to send reply")
      setReply("")
      await fetchTickets()
    } catch {
      setError("Failed to send reply.")
    } finally {
      setReplying(false)
    }
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
    setReply("")
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Help &amp; Support</h1>
          <p className="mt-1 text-sm text-gray-400">
            Submit a ticket and our team will get back to you.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <form
          onSubmit={createTicket}
          className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5"
        >
          <h2 className="mb-4 text-lg font-semibold text-white">New Support Ticket</h2>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the issue..."
              rows={4}
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Submitting..." : "Submit Ticket"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Ticket List */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 py-12 text-center">
          <p className="text-gray-500">No tickets yet.</p>
          <p className="mt-1 text-sm text-gray-600">
            Click &quot;New Ticket&quot; to get help from our team.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const expanded = expandedId === ticket.id
            const status = statusConfig[ticket.status] || statusConfig.open
            const StatusIcon = status.icon
            return (
              <div
                key={ticket.id}
                className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden"
              >
                {/* Ticket header */}
                <button
                  onClick={() => toggleExpand(ticket.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {ticket.subject}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDate(ticket.created_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      priorityColors[ticket.priority] || ""
                    }`}
                  >
                    {ticket.priority}
                  </span>
                  <span className={`flex items-center gap-1 text-xs ${status.color}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </span>
                </button>

                {/* Expanded content */}
                {expanded && (
                  <div className="border-t border-gray-800 px-4 py-4">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {ticket.description}
                    </p>

                    {/* Messages / conversation */}
                    {ticket.messages && ticket.messages.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-medium uppercase text-gray-500">
                          Conversation
                        </p>
                        {ticket.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className="rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-400">
                                {msg.sender}
                              </span>
                              <span className="text-[10px] text-gray-600">
                                {formatDate(msg.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-300 whitespace-pre-wrap">
                              {msg.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply box */}
                    {ticket.status !== "closed" && (
                      <div className="mt-4 flex gap-2">
                        <textarea
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder="Write a reply..."
                          rows={2}
                          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          onClick={() => sendReply(ticket.id)}
                          disabled={replying || !reply.trim()}
                          className="self-end rounded-lg bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
