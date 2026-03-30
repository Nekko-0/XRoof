"use client"

import { useEffect, useState } from "react"
import { Info, AlertTriangle, CheckCircle, X } from "lucide-react"

const ICONS: Record<string, any> = { info: Info, warning: AlertTriangle, success: CheckCircle }
const COLORS: Record<string, string> = {
  info: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
}

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<{ id: string; message: string; type: string } | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch("/api/admin/announce")
      .then(r => r.json())
      .then(data => {
        if (data.announcement) {
          const dismissedId = sessionStorage.getItem("dismissed-announcement")
          if (dismissedId !== data.announcement.id) {
            setAnnouncement(data.announcement)
          }
        }
      })
      .catch(() => {})
  }, [])

  if (!announcement || dismissed) return null

  const Icon = ICONS[announcement.type] || Info
  const color = COLORS[announcement.type] || COLORS.info

  return (
    <div className={`flex items-center gap-3 border-b px-4 py-2.5 ${color}`}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <p className="flex-1 text-xs font-medium">{announcement.message}</p>
      <button
        onClick={() => { setDismissed(true); sessionStorage.setItem("dismissed-announcement", announcement.id) }}
        className="flex-shrink-0 rounded p-1 hover:bg-black/10"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
