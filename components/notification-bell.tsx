"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Bell } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import { cn } from "@/lib/utils"
import { useEventListener } from "@/components/event-provider"

type Notification = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Subscribe to Web Push on mount
  useEffect(() => {
    const subscribeToPush = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return

      try {
        // Request notification permission
        const permission = await Notification.requestPermission()
        if (permission !== "granted") return

        const reg = await navigator.serviceWorker.ready
        let sub = await reg.pushManager.getSubscription()

        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          })
        }

        // Get auth token to send with API request
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Save subscription to server
        await authFetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        })
      } catch (err) {
        // Push subscription failed — not critical, in-app notifications still work
        console.warn("Push subscription failed:", err)
      }
    }

    subscribeToPush()
  }, [])

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.read).length)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Refresh notifications immediately when SSE events arrive
  const handleSSEEvent = useRef(() => { fetchNotifications() }).current
  useEventListener("sms_received", handleSSEEvent)
  useEventListener("contract_signed", handleSSEEvent)
  useEventListener("payment_received", handleSSEEvent)
  useEventListener("estimate_viewed", handleSSEEvent)
  useEventListener("notification", handleSSEEvent)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds)

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-secondary"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[calc(100vw-2rem)] sm:w-80 rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-primary hover:text-primary/80"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary/30",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{n.title}</span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/70">{timeAgo(n.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
