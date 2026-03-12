"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import {
  Clock,
  Mail,
  MessageSquare,
  DollarSign,
  ArrowRight,
  Loader2,
} from "lucide-react"

type Activity = {
  id: string
  job_id: string
  contractor_id: string | null
  activity_type: string
  description: string
  metadata: Record<string, unknown> | null
  created_at: string
}

const iconMap: Record<string, typeof Clock> = {
  status_change: ArrowRight,
  email_sent: Mail,
  note_added: MessageSquare,
  sms_sent: MessageSquare,
  payment_received: DollarSign,
}

const colorMap: Record<string, string> = {
  status_change: "text-blue-400",
  email_sent: "text-amber-400",
  note_added: "text-slate-400",
  sms_sent: "text-green-400",
  payment_received: "text-emerald-400",
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function ActivityTimeline({ jobId }: { jobId: string }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchActivities() {
      setLoading(true)
      const { data, error } = await supabase
        .from("job_activities")
        .select("id, job_id, contractor_id, activity_type, description, metadata, created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (!cancelled) {
        setActivities(error ? [] : (data as Activity[]) ?? [])
        setLoading(false)
      }
    }

    fetchActivities()
    return () => { cancelled = true }
  }, [jobId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading activity...
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <p className="py-3 text-sm text-muted-foreground">No activity yet.</p>
    )
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

      {activities.map((activity) => {
        const Icon = iconMap[activity.activity_type] || Clock
        const iconColor = colorMap[activity.activity_type] || "text-muted-foreground"

        return (
          <div key={activity.id} className="relative flex items-start gap-3 py-1.5">
            {/* Dot / Icon */}
            <div className={`relative z-10 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full bg-background border border-border ${iconColor}`}>
              <Icon className="h-3 w-3" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-px">
              <p className="text-sm leading-snug text-foreground truncate">
                {activity.description}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatRelativeTime(activity.created_at)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
