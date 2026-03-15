"use client"

import { useState, useRef, useEffect } from "react"
import { HelpCircle } from "lucide-react"

interface HelpTooltipProps {
  text: string
  className?: string
}

export function HelpTooltip({ text, className = "" }: HelpTooltipProps) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [show])

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-normal">
          <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md max-w-[240px] text-center">
            {text}
          </div>
          <div className="mx-auto h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-border" />
        </div>
      )}
    </div>
  )
}
