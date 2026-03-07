"use client"

import { useState, useEffect, useRef } from "react"
import { Send, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Conversation {
  job_id: string
  contact_id: string
  contact_name: string
  company_name?: string
  job_type: string
  last_message: string
  last_time: string
}

interface Message {
  id: string
  sender_id: string
  content: string
  image_url?: string | null
  created_at: string
}

interface ChatInterfaceProps {
  conversations: Conversation[]
  currentUserId: string
  onSelectConversation: (jobId: string, contactId: string) => void
  messages: Message[]
  onSendMessage: (text: string) => void
  onSendImage?: (file: File) => void
  selectedContactName: string
  loading?: boolean
}

export function ChatInterface({
  conversations,
  currentUserId,
  onSelectConversation,
  messages,
  onSendMessage,
  onSendImage,
  selectedContactName,
  loading,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [showConvoList, setShowConvoList] = useState(true)
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    onSendMessage(input.trim())
    setInput("")
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onSendImage) return
    setUploading(true)
    await onSendImage(file)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    if (diffDays === 1) return "Yesterday"
    return date.toLocaleDateString()
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Conversation list */}
      <div
        className={cn(
          "w-full flex-shrink-0 flex-col border-r border-border sm:w-80 sm:flex",
          showConvoList ? "flex" : "hidden sm:flex"
        )}
      >
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Messages</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
          )}
          {conversations.map((convo) => (
            <button
              key={convo.job_id + convo.contact_id}
              onClick={() => {
                onSelectConversation(convo.job_id, convo.contact_id)
                setShowConvoList(false)
              }}
              className={cn(
                "flex w-full flex-col gap-1 border-b border-border px-4 py-3.5 text-left transition-colors hover:bg-secondary/30"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{convo.contact_name}</span>
                <span className="text-xs text-muted-foreground">{formatTime(convo.last_time)}</span>
              </div>
              {convo.company_name && (
                <span className="text-xs text-muted-foreground">{convo.company_name}</span>
              )}
              <p className="truncate text-xs text-muted-foreground">{convo.last_message}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className={cn("flex flex-1 flex-col", showConvoList ? "hidden sm:flex" : "flex")}>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground sm:hidden"
            onClick={() => setShowConvoList(true)}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {selectedContactName ? selectedContactName.charAt(0) : "?"}
          </div>
          <span className="text-sm font-semibold text-foreground">
            {selectedContactName || "Select a conversation"}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          {loading && <p className="text-sm text-muted-foreground">Loading messages...</p>}
          {!loading && messages.length === 0 && selectedContactName && (
            <p className="text-center text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div
                key={msg.id}
                className={cn("flex", isMe ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                    isMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {msg.image_url && (
                    <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={msg.image_url}
                        alt="Shared image"
                        className="mb-2 max-h-48 rounded-lg object-cover"
                      />
                    </a>
                  )}
                  {msg.content && (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {selectedContactName && (
          <div className="border-t border-border p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <button
                type="submit"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
