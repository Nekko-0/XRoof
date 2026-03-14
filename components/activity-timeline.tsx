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
  Eye,
  CheckCircle,
  Send,
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
  // document_events types
  sent: Send,
  opened: Eye,
  viewed: Eye,
  interested: CheckCircle,
  signed: CheckCircle,
  reminder_sent: Mail,
}

const colorMap: Record<string, string> = {
  status_change: "text-blue-400",
  email_sent: "text-amber-400",
  note_added: "text-slate-400",
  sms_sent: "text-green-400",
  payment_received: "text-emerald-400",
  // document_events types
  sent: "text-blue-400",
  opened: "text-amber-400",
  viewed: "text-amber-400",
  interested: "text-emerald-400",
  signed: "text-emerald-400",
  reminder_sent: "text-orange-400",
}

const docEventLabels: Record<string, Record<string, string>> = {
  report: { sent: "Estimate sent", opened: "Estimate email opened", interested: "Estimate accepted" },
  invoice: { sent: "Invoice created", viewed: "Invoice viewed", reminder_sent: "Payment reminder sent", opened: "Reminder email opened" },
  contract: { sent: "Contract sent", opened: "Contract email opened", signed: "Contract signed" },
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  const datepart = date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })
  const stamp = `${datepart} ${time}`
  if (diffMin < 1) return `just now · ${stamp}`
  if (diffMin < 60) return `${diffMin}m ago · ${stamp}`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago · ${stamp}`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago · ${stamp}`
  return stamp
}

export function ActivityTimeline({ jobId }: { jobId: string }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchActivities() {
      setLoading(true)

      const [jobRes, docRes] = await Promise.all([
        supabase
          .from("job_activities")
          .select("id, job_id, contractor_id, activity_type, description, metadata, created_at")
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("document_events")
          .select("id, job_id, event_type, document_type, recipient_email, created_at")
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(30),
      ])

      const jobActivities = (jobRes.data as Activity[]) ?? []

      // Convert document_events to Activity format
      const docActivities: Activity[] = ((docRes.data as any[]) ?? []).map((evt) => {
        const docType = evt.document_type || "document"
        const label = docEventLabels[docType]?.[evt.event_type] || `${docType} ${evt.event_type}`
        const emailSuffix = evt.recipient_email ? ` — ${evt.recipient_email}` : ""
        return {
          id: `doc-${evt.id}`,
          job_id: evt.job_id,
          contractor_id: null,
          activity_type: evt.event_type,
          description: `${label}${emailSuffix}`,
          metadata: null,
          created_at: evt.created_at,
        }
      })

      // Merge and sort by date descending
      const merged = [...jobActivities, ...docActivities]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50)

      if (!cancelled) {
        setActivities(merged)
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
