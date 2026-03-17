"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react"

type TourStep = {
  target: string // CSS selector
  title: string
  description: string
  placement: "top" | "bottom" | "left" | "right"
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='dashboard']",
    title: "Your Dashboard",
    description: "See revenue, active jobs, close rates, and pipeline health at a glance. Everything updates in real-time.",
    placement: "bottom",
  },
  {
    target: "[data-tour='jobs']",
    title: "My Jobs",
    description: "All your leads and jobs in one place. Add new ones, track status, send estimates, and manage the full lifecycle.",
    placement: "right",
  },
  {
    target: "[data-tour='measure']",
    title: "Satellite Measurement",
    description: "Search an address and measure the roof from satellite imagery. Draw polygons, set pitch, and calculate materials.",
    placement: "right",
  },
  {
    target: "[data-tour='pipeline']",
    title: "Sales Pipeline",
    description: "Drag leads through stages to track your sales funnel. See where deals are stalling and focus your follow-ups.",
    placement: "right",
  },
  {
    target: "[data-tour='search']",
    title: "Quick Search",
    description: "Search for any job, customer, or address instantly. Press Cmd+K for the command palette.",
    placement: "bottom",
  },
]

const STORAGE_KEY = "xroof_tour_completed"

export function ProductTour() {
  const pathname = usePathname()
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (pathname !== "/contractor/dashboard") return
    if (typeof window === "undefined") return
    if (localStorage.getItem(STORAGE_KEY) === "true") return

    // Delay to let the page render
    const timer = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    if (!visible) return
    const currentStep = TOUR_STEPS[step]
    if (!currentStep) return

    const el = document.querySelector(currentStep.target)
    if (!el) return

    const rect = el.getBoundingClientRect()
    const scrollY = window.scrollY
    const scrollX = window.scrollX

    let top = 0
    let left = 0

    switch (currentStep.placement) {
      case "bottom":
        top = rect.bottom + scrollY + 12
        left = rect.left + scrollX + rect.width / 2
        break
      case "top":
        top = rect.top + scrollY - 12
        left = rect.left + scrollX + rect.width / 2
        break
      case "right":
        top = rect.top + scrollY + rect.height / 2
        left = rect.right + scrollX + 12
        break
      case "left":
        top = rect.top + scrollY + rect.height / 2
        left = rect.left + scrollX - 12
        break
    }

    setPos({ top, left })

    // Highlight the target element
    el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background", "rounded-lg", "relative", "z-50")
    return () => {
      el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background", "rounded-lg", "relative", "z-50")
    }
  }, [step, visible])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, "true")
  }

  function next() {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      dismiss()
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1)
  }

  if (!visible) return null

  const currentStep = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={dismiss} />

      {/* Tooltip */}
      <div
        className="fixed z-[70] w-72 rounded-xl border border-primary/30 bg-card p-4 shadow-xl shadow-primary/10"
        style={{
          top: pos.top,
          left: pos.left,
          transform: currentStep.placement === "bottom" || currentStep.placement === "top"
            ? "translateX(-50%)"
            : "translateY(-50%)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-bold text-primary">
            Step {step + 1} of {TOUR_STEPS.length}
          </span>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <h4 className="text-sm font-semibold text-foreground">{currentStep.title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{currentStep.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
          <button
            onClick={next}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            {isLast ? (
              <>Finish <Check className="h-3 w-3" /></>
            ) : (
              <>Next <ArrowRight className="h-3 w-3" /></>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
