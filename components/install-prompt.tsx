"use client"

import { useEffect, useState, useRef } from "react"
import { Download, X, Smartphone, Share } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Already installed as standalone
    if (window.matchMedia("(display-mode: standalone)").matches) return

    // Permanently dismissed
    if (localStorage.getItem("xroof-install-dismissed")) return

    // Track visits — show on 1st visit and every 5th
    const count = Number(localStorage.getItem("xroof-visit-count") || "0") + 1
    localStorage.setItem("xroof-visit-count", String(count))
    if (count !== 1 && count % 5 !== 0) return

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    if (ios) {
      setTimeout(() => setShow(true), 3000)
    } else {
      const handler = (e: Event) => {
        e.preventDefault()
        deferredPrompt.current = e as BeforeInstallPromptEvent
        setShow(true)
      }
      window.addEventListener("beforeinstallprompt", handler)
      // Fallback for browsers without beforeinstallprompt
      const timer = setTimeout(() => setShow(true), 5000)
      return () => {
        window.removeEventListener("beforeinstallprompt", handler)
        clearTimeout(timer)
      }
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt.current) return
    deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === "accepted") {
      localStorage.setItem("xroof-install-dismissed", "1")
      setShow(false)
    }
    deferredPrompt.current = null
  }

  // "Not Now" — hides for this session only (will reappear on next qualifying visit)
  const handleNotNow = () => {
    setShow(false)
  }

  // "X" — permanently dismiss
  const handleDismiss = () => {
    localStorage.setItem("xroof-install-dismissed", "1")
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-sm md:bottom-4 md:left-auto md:right-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xl animate-in slide-in-from-bottom-4">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
          aria-label="Don't show again"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Install XRoof</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
              {isIOS
                ? "Add to your home screen for quick access to your jobs."
                : "Install the app for faster access, offline mode, and push notifications."
              }
            </p>
            {isIOS ? (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">
                <Share className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span>Tap <strong className="text-foreground">Share</strong> then <strong className="text-foreground">Add to Home Screen</strong></span>
              </div>
            ) : (
              <div className="mt-2.5 flex items-center gap-2">
                {deferredPrompt.current && (
                  <button
                    onClick={handleInstall}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Install
                  </button>
                )}
                <button
                  onClick={handleNotNow}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Not now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
