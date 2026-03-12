"use client"

import { useEffect, useState } from "react"
import { Bell, X } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"

export function PushPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Only show if: browser supports push, not already subscribed, not dismissed
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    if (localStorage.getItem("xroof-push-dismissed")) return

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      if (!sub) {
        // Delay prompt so it doesn't appear on first load
        setTimeout(() => setShow(true), 5000)
      }
    })
  }, [])

  const handleEnable = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setShow(false)
        return
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      await authFetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      })

      setShow(false)
    } catch {
      // User denied or error
      localStorage.setItem("xroof-push-dismissed", "1")
      setShow(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem("xroof-push-dismissed", "1")
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-2xl border border-border bg-card p-4 shadow-xl animate-in slide-in-from-bottom-4">
      <button onClick={handleDismiss} className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Enable Notifications</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Get notified about new leads, estimate views, and payments.
          </p>
          <button
            onClick={handleEnable}
            className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Turn On
          </button>
        </div>
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
