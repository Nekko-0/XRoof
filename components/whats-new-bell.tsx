"use client"

import { useEffect, useRef, useState } from "react"
import { Bell } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"

type ChangelogEntry = {
  id: string
  title: string
  description: string
  category: "feature" | "improvement" | "fix" | "announcement"
  created_at: string
}

const categoryColors: Record<string, string> = {
  feature: "bg-indigo-500/15 text-indigo-400",
  improvement: "bg-emerald-500/15 text-emerald-400",
  fix: "bg-amber-500/15 text-amber-400",
  announcement: "bg-blue-500/15 text-blue-400",
}

export default function WhatsNewBell() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    authFetch("/api/changelog")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries || [])
        setUnreadCount(data.unreadCount || 0)
      })
      .catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  function toggle() {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && unreadCount > 0) {
      setUnreadCount(0)
      authFetch("/api/changelog", { method: "POST" }).catch(() => {})
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative rounded-md p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="What's new"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
          <div className="border-b border-gray-700 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">What&apos;s New</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {entries.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                No updates yet.
              </p>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="border-b border-gray-800 px-4 py-3 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        categoryColors[entry.category] || "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {entry.category}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-white">
                    {entry.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">
                    {entry.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
