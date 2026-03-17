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
  Search,
  BookOpen,
  Rocket,
  FileText,
  CreditCard,
  Users,
  Smartphone,
  Zap,
  Shield,
  BarChart3,
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

const KB_CATEGORIES = [
  {
    name: "Getting Started",
    icon: Rocket,
    articles: [
      { title: "Create your contractor profile", body: "Go to Settings and fill in your company name, logo, service area zip codes, and contact info. This branding appears on all estimates, contracts, and your customer portal." },
      { title: "Add your first lead", body: "Navigate to My Jobs and click 'Add Job.' Enter the customer name, address, phone, email, job type, and budget. The lead will appear in your pipeline automatically." },
      { title: "Measure a roof from satellite", body: "Go to the Measure tool, search an address, and draw the roof outline on the satellite image. Set the pitch, classify edges (ridge, hip, valley, eave, rake), and XRoof calculates area, waste factor, and materials." },
      { title: "Send your first estimate", body: "Open a job, click 'Create Estimate,' choose materials, add pricing tiers, and hit Send. The customer gets a branded link to view, approve, and e-sign." },
    ],
  },
  {
    name: "Estimates & Contracts",
    icon: FileText,
    articles: [
      { title: "Build a branded proposal", body: "Use the Report Builder to create PDF proposals with your logo, pricing tiers, material swatches, photo galleries, and scope of work. Customers can view online or download as PDF." },
      { title: "Send a contract for e-signature", body: "After creating an estimate, click 'Send Contract.' The customer receives a link to review terms and sign electronically. Signatures are ESIGN-compliant and legally binding." },
      { title: "Use job templates", body: "Go to Settings > Templates to create reusable job templates. When adding a new job, select a template to pre-fill job type, description, and budget." },
    ],
  },
  {
    name: "Payments & Invoicing",
    icon: CreditCard,
    articles: [
      { title: "Connect Stripe", body: "Go to Settings and click 'Connect Stripe.' This lets you collect deposits, progress payments, and final invoices directly from customer portal links. Funds go to your bank account." },
      { title: "Create milestone invoices", body: "On any job, go to the Invoices tab and create invoices for each milestone (deposit, 50% completion, final). Customers pay through a secure Stripe link." },
      { title: "Track outstanding payments", body: "Your dashboard shows total outstanding invoices. Overdue invoices trigger automatic payment reminders if you have automations enabled." },
    ],
  },
  {
    name: "Team Management",
    icon: Users,
    articles: [
      { title: "Invite team members", body: "Go to the Team page and click 'Invite.' Enter their email and select a role (admin, office manager, sales, field tech, or viewer). They'll get an email to set up their account." },
      { title: "Role-based permissions", body: "Each role has different access: owners see everything, admins manage settings, office managers handle scheduling, sales reps see pipeline, field techs see assigned jobs, viewers are read-only." },
      { title: "Dispatch & work orders", body: "Use the Dispatch board to assign crew members to jobs by day. Work Orders let you create detailed task lists for each job that field techs can check off." },
    ],
  },
  {
    name: "Automations",
    icon: Zap,
    articles: [
      { title: "Set up automated follow-ups", body: "Go to Automations and create rules like 'When estimate is sent, send follow-up email after 2 days.' Supports email and SMS sequences with customizable delays." },
      { title: "Appointment reminders", body: "Automatic reminders are sent to customers before scheduled appointments. Configure timing in Settings > Notifications." },
      { title: "Satisfaction surveys", body: "After a job is marked complete, XRoof automatically sends a satisfaction survey. High ratings prompt a Google Review request." },
    ],
  },
  {
    name: "Mobile & Field Mode",
    icon: Smartphone,
    articles: [
      { title: "Install the PWA", body: "On your phone, open xroof.io in Safari (iPhone) or Chrome (Android), tap Share > Add to Home Screen. XRoof installs as a native-feeling app with offline support." },
      { title: "Use Field Mode", body: "Field Mode shows today's schedule with large touch targets. Tap a job to see details, call the customer, add notes, or mark it complete — all optimized for on-site use." },
      { title: "Offline support", body: "XRoof caches key pages so you can view jobs and schedules even without cell service. Data syncs when you're back online." },
    ],
  },
  {
    name: "Analytics & Reports",
    icon: BarChart3,
    articles: [
      { title: "Understand your dashboard", body: "The dashboard shows revenue (MTD), active jobs, close rate, pipeline value, deal velocity, and lead sources. Weather correlation helps you spot storm-driven demand." },
      { title: "Lead source ROI", body: "Track which lead sources (Google Ads, referrals, canvassing) generate the most revenue. See conversion rates and average deal size by source." },
      { title: "Export your data", body: "Use the Export feature to download jobs, customers, and invoices as CSV files for your accountant or external reporting." },
    ],
  },
]

export default function HelpPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Knowledge base
  const [kbSearch, setKbSearch] = useState("")
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredCategories = kbSearch.trim()
    ? KB_CATEGORIES.map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
            a.body.toLowerCase().includes(kbSearch.toLowerCase())
        ),
      })).filter((cat) => cat.articles.length > 0)
    : activeCategory
      ? KB_CATEGORIES.filter((cat) => cat.name === activeCategory)
      : KB_CATEGORIES

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
      {/* Knowledge Base */}
      <div className="mb-10">
        <div className="mb-6 text-center">
          <BookOpen className="mx-auto mb-2 h-8 w-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Help Center</h1>
          <p className="mt-1 text-sm text-gray-400">
            Search our knowledge base or submit a support ticket below.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={kbSearch}
            onChange={(e) => { setKbSearch(e.target.value); setActiveCategory(null) }}
            placeholder="Search help articles..."
            className="w-full rounded-xl border border-gray-700 bg-gray-800 py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Category pills */}
        {!kbSearch.trim() && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !activeCategory ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              All
            </button>
            {KB_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeCategory === cat.name ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                <cat.icon className="h-3 w-3" />
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Articles */}
        <div className="space-y-6">
          {filteredCategories.map((cat) => (
            <div key={cat.name}>
              <div className="mb-2 flex items-center gap-2">
                <cat.icon className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white">{cat.name}</h2>
              </div>
              <div className="space-y-1">
                {cat.articles.map((article) => (
                  <details
                    key={article.title}
                    className="group rounded-lg border border-gray-800 bg-gray-900 transition-colors hover:border-gray-700"
                    open={expandedArticle === article.title}
                    onToggle={(e) => {
                      const isOpen = (e.target as HTMLDetailsElement).open
                      setExpandedArticle(isOpen ? article.title : null)
                    }}
                  >
                    <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-gray-200">
                      {article.title}
                      <ChevronDown className="h-3.5 w-3.5 text-gray-500 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-gray-800 px-4 py-3">
                      <p className="text-sm leading-relaxed text-gray-400">{article.body}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 py-8 text-center">
              <p className="text-sm text-gray-500">No articles found for &quot;{kbSearch}&quot;</p>
              <p className="mt-1 text-xs text-gray-600">Try a different search or submit a ticket below.</p>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mb-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-gray-800" />
        <span className="text-xs font-medium text-gray-500">SUPPORT TICKETS</span>
        <div className="h-px flex-1 bg-gray-800" />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Your Tickets</h2>
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
