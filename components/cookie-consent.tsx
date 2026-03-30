"use client"

import { useState, useEffect } from "react"

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent")
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted")
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem("cookie-consent", "declined")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-lg">
        <p className="text-sm text-foreground mb-3">
          We use cookies and analytics to improve your experience. See our{" "}
          <a href="/privacy" className="text-primary underline">Privacy Policy</a>.
        </p>
        <div className="flex gap-2">
          <button
            onClick={accept}
            className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Accept
          </button>
          <button
            onClick={decline}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
