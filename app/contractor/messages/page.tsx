"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import { useToast } from "@/lib/toast-context"
import {
  MessageSquare, Send, Phone, ArrowLeft, RefreshCw,
  MessageCircle, User, Users,
} from "lucide-react"

type SmsConversation = {
  phone_number: string
  customer_name: string | null
  job_id: string | null
  last_message: string
  last_direction: string
  last_time: string
  unread_count: number
  message_count: number
}

type SmsMessage = {
  id: string
  direction: string
  body: string
  customer_name: string | null
  created_at: string
  status: string
}

type PortalThread = {
  job_id: string
  customer_name: string
  last_message: string
  last_sender: string
  last_time: string
  count: number
}

type PortalMsg = {
  id: string
  job_id: string
  sender: "homeowner" | "contractor"
  message: string
  created_at: string
}

export default function ContractorMessagesPage() {
  const toast = useToast()
  const [tab, setTab] = useState<"sms" | "admin" | "portal">("sms")
  const [conversations, setConversations] = useState<SmsConversation[]>([])
  const [selectedPhone, setSelectedPhone] = useState("")
  const [selectedName, setSelectedName] = useState("")
  const [thread, setThread] = useState<SmsMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const [newSmsPhone, setNewSmsPhone] = useState("")
  const [newSmsMessage, setNewSmsMessage] = useState("")
  const [showNewSms, setShowNewSms] = useState(false)
  const [leads, setLeads] = useState<{ id: string; customer_name: string; customer_phone: string }[]>([])
  const threadEndRef = useRef<HTMLDivElement>(null)

  // Admin messaging state
  const [adminMessages, setAdminMessages] = useState<{ id: string; sender_id: string; content: string; image_url?: string | null; created_at: string }[]>([])
  const [adminReply, setAdminReply] = useState("")
  const [userId, setUserId] = useState("")
  const [adminId, setAdminId] = useState("")

  // Portal messaging state
  const [portalThreads, setPortalThreads] = useState<PortalThread[]>([])
  const [portalLoading, setPortalLoading] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState("")
  const [selectedCustomerName, setSelectedCustomerName] = useState("")
  const [portalMessages, setPortalMessages] = useState<PortalMsg[]>([])
  const [portalThreadLoading, setPortalThreadLoading] = useState(false)
  const [portalReply, setPortalReply] = useState("")
  const [portalSending, setPortalSending] = useState(false)
  const portalEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversations()
    loadAdminChat()
    loadLeads()
    loadPortalThreads()
  }, [])

  const loadLeads = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from("jobs")
      .select("id, customer_name, customer_phone")
      .eq("contractor_id", session.user.id)
      .not("customer_phone", "is", null)
      .neq("customer_phone", "")
      .order("created_at", { ascending: false })
    setLeads(data || [])
  }

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [thread])

  const loadConversations = async () => {
    setLoading(true)
    try {
      const res = await authFetch("/api/sms/conversations")
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch {
      // SMS not configured or no conversations
    }
    setLoading(false)
  }

  const loadAdminChat = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
      .single()

    if (adminProfile) {
      setAdminId(adminProfile.id)
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, content, image_url, created_at")
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order("created_at", { ascending: true })
      setAdminMessages(data || [])
    }
  }

  const loadThread = async (phone: string) => {
    setThreadLoading(true)
    setSelectedPhone(phone)
    const conv = conversations.find((c) => c.phone_number === phone)
    setSelectedName(conv?.customer_name || formatPhone(phone))
    try {
      const res = await authFetch(`/api/sms/thread?phone=${phone}`)
      const data = await res.json()
      setThread(data.messages || [])
    } catch {
      toast.error("Failed to load messages")
    }
    setThreadLoading(false)
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedPhone) return
    setSending(true)
    try {
      const res = await authFetch("/api/sms/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selectedPhone, message: replyText.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        setThread((prev) => [...prev, data.message])
        setReplyText("")
      }
    } catch {
      toast.error("Failed to send SMS")
    }
    setSending(false)
  }

  const handleSendNewSms = async () => {
    if (!newSmsPhone.trim() || !newSmsMessage.trim()) return
    setSending(true)
    const phone = newSmsPhone.replace(/\D/g, "")
    try {
      const res = await authFetch("/api/sms/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: newSmsMessage.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success("SMS sent!")
        setNewSmsPhone("")
        setNewSmsMessage("")
        setShowNewSms(false)
        await loadConversations()
        setSelectedPhone(phone)
        await loadThread(phone)
      }
    } catch {
      toast.error("Failed to send SMS")
    }
    setSending(false)
  }

  const handleSendAdminMessage = async () => {
    if (!adminReply.trim() || !userId || !adminId) return
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: userId,
        receiver_id: adminId,
        content: adminReply.trim(),
      })
      .select("id, sender_id, content, created_at")
      .single()

    if (error) {
      toast.error("Error: " + error.message)
    } else if (data) {
      setAdminMessages((prev) => [...prev, data])
      setAdminReply("")
    }
  }

  const loadPortalThreads = async () => {
    setPortalLoading(true)
    try {
      const res = await authFetch("/api/contractor/portal-messages")
      const data = await res.json()
      setPortalThreads(data.threads || [])
    } catch {}
    setPortalLoading(false)
  }

  const loadPortalThread = async (jobId: string) => {
    setPortalThreadLoading(true)
    setSelectedJobId(jobId)
    const thread = portalThreads.find((t) => t.job_id === jobId)
    setSelectedCustomerName(thread?.customer_name || "Customer")
    try {
      const res = await authFetch(`/api/contractor/portal-messages?job_id=${jobId}`)
      const data = await res.json()
      setPortalMessages(data.messages || [])
    } catch {
      toast.error("Failed to load messages")
    }
    setPortalThreadLoading(false)
  }

  const handleSendPortalReply = async () => {
    if (!portalReply.trim() || !selectedJobId || portalSending) return
    setPortalSending(true)
    try {
      const res = await authFetch("/api/contractor/portal-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: selectedJobId, message: portalReply.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        setPortalMessages((prev) => [...prev, data.message])
        setPortalReply("")
      }
    } catch {
      toast.error("Failed to send message")
    }
    setPortalSending(false)
  }

  useEffect(() => {
    portalEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [portalMessages])

  // Auto-poll portal thread every 5s when viewing a conversation
  useEffect(() => {
    if (tab !== "portal" || !selectedJobId) return
    const interval = setInterval(async () => {
      try {
        const res = await authFetch(`/api/contractor/portal-messages?job_id=${selectedJobId}`)
        const data = await res.json()
        setPortalMessages(data.messages || [])
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [tab, selectedJobId])

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "")
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return phone
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return "now"
    if (diffMin < 60) return `${diffMin}m`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay}d`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border px-4 py-2 bg-card">
        <button
          onClick={() => setTab("sms")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            tab === "sms" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Phone className="h-3.5 w-3.5" />
          SMS Inbox
          {conversations.some((c) => c.unread_count > 0) && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {conversations.reduce((sum, c) => sum + c.unread_count, 0)}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("admin")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            tab === "admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Admin Chat
        </button>
        <button
          onClick={() => setTab("portal")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            tab === "portal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Portal
          {portalThreads.length > 0 && (
            <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {portalThreads.length}
            </span>
          )}
        </button>
      </div>

      {/* SMS Tab */}
      {tab === "sms" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Conversation List */}
          <div className={`w-full md:w-80 border-r border-border bg-card flex flex-col ${selectedPhone ? "hidden md:flex" : "flex"}`}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">SMS Conversations</h2>
              <div className="flex items-center gap-2">
                <button onClick={loadConversations} className="rounded-lg p-1.5 hover:bg-secondary transition-colors text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setShowNewSms(true)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  New SMS
                </button>
              </div>
            </div>

            {/* New SMS Form */}
            {showNewSms && (
              <div className="p-3 border-b border-border bg-primary/5 space-y-2">
                {leads.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      const lead = leads.find((l) => l.id === e.target.value)
                      if (lead) setNewSmsPhone(lead.customer_phone)
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select a lead...</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.customer_name} — {lead.customer_phone}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="tel"
                  value={newSmsPhone}
                  onChange={(e) => setNewSmsPhone(e.target.value)}
                  placeholder="Or enter phone number"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <textarea
                  value={newSmsMessage}
                  onChange={(e) => setNewSmsMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendNewSms}
                    disabled={sending || !newSmsPhone.trim() || !newSmsMessage.trim()}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                  <button
                    onClick={() => { setShowNewSms(false); setNewSmsPhone(""); setNewSmsMessage("") }}
                    className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Conversation items */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="p-4 text-xs text-muted-foreground">Loading...</p>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No SMS conversations yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Send an SMS or configure your Twilio number to receive messages</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.phone_number}
                    onClick={() => loadThread(conv.phone_number)}
                    className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-secondary/50 transition-colors ${
                      selectedPhone === conv.phone_number ? "bg-secondary" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground truncate">
                        {conv.customer_name || formatPhone(conv.phone_number)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(conv.last_time)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground truncate flex-1 pr-2">
                        {conv.last_direction === "outbound" ? "You: " : ""}{conv.last_message}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    {conv.customer_name && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatPhone(conv.phone_number)}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Thread View */}
          <div className={`flex-1 flex flex-col ${!selectedPhone ? "hidden md:flex" : "flex"}`}>
            {selectedPhone ? (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
                  <button
                    onClick={() => setSelectedPhone("")}
                    className="md:hidden rounded-lg p-1.5 hover:bg-secondary transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{selectedName}</p>
                      <p className="text-[10px] text-muted-foreground">{formatPhone(selectedPhone)}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {threadLoading ? (
                    <p className="text-xs text-muted-foreground text-center">Loading messages...</p>
                  ) : thread.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center">No messages in this conversation</p>
                  ) : (
                    thread.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            msg.direction === "outbound"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-secondary text-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                          <p className={`text-[9px] mt-1 ${
                            msg.direction === "outbound" ? "text-primary-foreground/60" : "text-muted-foreground"
                          }`}>
                            {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={threadEndRef} />
                </div>

                {/* Reply input */}
                <div className="border-t border-border p-3 bg-card">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply() } }}
                      placeholder="Type a message..."
                      className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="rounded-xl bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a conversation</p>
                  <p className="text-xs text-muted-foreground mt-1">or send a new SMS</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Tab */}
      {tab === "admin" && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {adminMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No admin messages yet</p>
            ) : (
              adminMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      msg.sender_id === userId
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.image_url && (
                      <img src={msg.image_url} alt="" className="max-w-full rounded-lg mb-2" />
                    )}
                    {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                    <p className={`text-[9px] mt-1 ${
                      msg.sender_id === userId ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-border p-3 bg-card">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendAdminMessage() } }}
                placeholder="Message admin..."
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleSendAdminMessage}
                disabled={!adminReply.trim()}
                className="rounded-xl bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portal Tab */}
      {tab === "portal" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Thread List */}
          <div className={`w-full md:w-80 border-r border-border bg-card flex flex-col ${selectedJobId ? "hidden md:flex" : "flex"}`}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Portal Messages</h2>
              <button onClick={loadPortalThreads} className="rounded-lg p-1.5 hover:bg-secondary transition-colors text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {portalLoading ? (
                <p className="p-4 text-xs text-muted-foreground">Loading...</p>
              ) : portalThreads.length === 0 ? (
                <div className="p-6 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No portal messages yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Customers can message you through their project portal</p>
                </div>
              ) : (
                portalThreads.map((thread) => (
                  <button
                    key={thread.job_id}
                    onClick={() => loadPortalThread(thread.job_id)}
                    className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-secondary/50 transition-colors ${
                      selectedJobId === thread.job_id ? "bg-secondary" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground truncate">{thread.customer_name}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(thread.last_time)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {thread.last_sender === "contractor" ? "You: " : ""}{thread.last_message}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Thread View */}
          <div className={`flex-1 flex flex-col ${!selectedJobId ? "hidden md:flex" : "flex"}`}>
            {selectedJobId ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
                  <button
                    onClick={() => setSelectedJobId("")}
                    className="md:hidden rounded-lg p-1.5 hover:bg-secondary transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{selectedCustomerName}</p>
                      <p className="text-[10px] text-muted-foreground">Portal Messages</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {portalThreadLoading ? (
                    <p className="text-xs text-muted-foreground text-center">Loading messages...</p>
                  ) : portalMessages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center">No messages in this conversation</p>
                  ) : (
                    portalMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === "contractor" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            msg.sender === "contractor"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-secondary text-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-[9px] mt-1 ${
                            msg.sender === "contractor" ? "text-primary-foreground/60" : "text-muted-foreground"
                          }`}>
                            {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={portalEndRef} />
                </div>

                <div className="border-t border-border p-3 bg-card">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={portalReply}
                      onChange={(e) => setPortalReply(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendPortalReply() } }}
                      placeholder="Reply to customer..."
                      className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={handleSendPortalReply}
                      disabled={portalSending || !portalReply.trim()}
                      className="rounded-xl bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a conversation</p>
                  <p className="text-xs text-muted-foreground mt-1">to view portal messages from customers</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
