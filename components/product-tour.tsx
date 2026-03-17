"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { X, ArrowRight, ArrowLeft, Check, Moon, Sun } from "lucide-react"

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

/* Mini dashboard preview for theme picker */
function ThemePreview({ mode, selected, onSelect }: { mode: "dark" | "light"; selected: boolean; onSelect: () => void }) {
  const isDark = mode === "dark"
  const bg = isDark ? "#09090b" : "#ffffff"
  const sidebar = isDark ? "#0f0f12" : "#f8fafc"
  const card = isDark ? "#18181b" : "#f4f4f5"
  const text = isDark ? "#e4e4e7" : "#09090b"
  const muted = isDark ? "#27272a" : "#e4e4e7"
  const cyan = "#0891b2"

  return (
    <button
      onClick={onSelect}
      className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
        selected ? "border-[#0891b2] ring-2 ring-[#0891b2]/30" : "border-transparent hover:border-[#0891b2]/30"
      }`}
      style={{ background: isDark ? "#18181b" : "#f4f4f5" }}
    >
      {/* Mini mockup */}
      <div className="w-32 overflow-hidden rounded-lg border" style={{ borderColor: muted, background: bg }}>
        {/* Header */}
        <div className="flex items-center gap-1.5 px-2 py-1" style={{ borderBottom: `1px solid ${muted}` }}>
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: cyan }} />
          <div className="h-1 w-8 rounded" style={{ background: muted }} />
        </div>
        <div className="flex">
          {/* Sidebar */}
          <div className="w-7 space-y-1 p-1" style={{ background: sidebar, borderRight: `1px solid ${muted}` }}>
            <div className="h-1 w-full rounded" style={{ background: cyan }} />
            <div className="h-1 w-full rounded" style={{ background: muted }} />
            <div className="h-1 w-full rounded" style={{ background: muted }} />
            <div className="h-1 w-full rounded" style={{ background: muted }} />
          </div>
          {/* Content */}
          <div className="flex-1 space-y-1 p-1.5">
            <div className="flex gap-1">
              <div className="h-4 flex-1 rounded" style={{ background: card }} />
              <div className="h-4 flex-1 rounded" style={{ background: card }} />
            </div>
            <div className="h-6 w-full rounded" style={{ background: card }} />
            <div className="flex gap-1">
              <div className="h-2 flex-1 rounded" style={{ background: cyan, opacity: 0.6 }} />
              <div className="h-2 flex-1 rounded" style={{ background: muted }} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {isDark ? <Moon className="h-3 w-3" style={{ color: text }} /> : <Sun className="h-3 w-3" style={{ color: text }} />}
        <span className="text-xs font-semibold" style={{ color: text }}>{isDark ? "Dark" : "Light"}</span>
      </div>
      {selected && (
        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0891b2]">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
    </button>
  )
}

export function ProductTour() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [step, setStep] = useState(-1) // -1 = theme picker step
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [selectedTheme, setSelectedTheme] = useState<"dark" | "light">("dark")

  useEffect(() => {
    if (pathname !== "/contractor/dashboard") return
    if (typeof window === "undefined") return
    if (localStorage.getItem(STORAGE_KEY) === "true") return

    // Sync with current theme
    setSelectedTheme((theme as "dark" | "light") || "dark")

    // Delay to let the page render
    const timer = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(timer)
  }, [pathname, theme])

  // Position tooltip for tour steps (not theme picker)
  useEffect(() => {
    if (!visible || step < 0) return
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
    if (step === -1) {
      // Apply chosen theme and move to tour
      setTheme(selectedTheme)
      setStep(0)
    } else if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      dismiss()
    }
  }

  function prev() {
    if (step === 0) {
      setStep(-1) // Go back to theme picker
    } else if (step > 0) {
      setStep(step - 1)
    }
  }

  if (!visible) return null

  const isThemePicker = step === -1
  const totalSteps = TOUR_STEPS.length + 1 // +1 for theme picker
  const displayStep = step + 2 // theme picker is step 1

  // Theme picker (Step 0)
  if (isThemePicker) {
    return (
      <>
        <div className="fixed inset-0 z-[60] bg-black/50" onClick={dismiss} />
        <div className="fixed left-1/2 top-1/2 z-[70] w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-primary/30 bg-card p-5 shadow-2xl shadow-primary/10">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-primary">Step 1 of {totalSteps}</span>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <h4 className="text-sm font-semibold text-foreground">Choose Your Look</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Pick a theme for your dashboard. You can always change this later in Settings.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <ThemePreview mode="dark" selected={selectedTheme === "dark"} onSelect={() => { setSelectedTheme("dark"); setTheme("dark") }} />
            <ThemePreview mode="light" selected={selectedTheme === "light"} onSelect={() => { setSelectedTheme("light"); setTheme("light") }} />
          </div>
          <div className="mt-4 flex items-center justify-end">
            <button
              onClick={next}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Next <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </>
    )
  }

  // Regular tour steps
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
            Step {displayStep} of {totalSteps}
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
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
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
