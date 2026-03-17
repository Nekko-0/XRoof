import { cn } from "@/lib/utils"

type JobStatus = "pending" | "negotiating" | "assigned" | "accepted" | "completed" | "cancelled"

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
  negotiating: {
    label: "Negotiating",
    className: "bg-red-500/15 text-red-600 border-red-500/30",
  },
  assigned: {
    label: "Assigned",
    className: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
  accepted: {
    label: "Accepted",
    className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  },
  completed: {
    label: "Job Completed",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-500/15 text-gray-600 border-gray-500/30",
  },
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase() as JobStatus
  const config = statusConfig[key] || statusConfig["pending"]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className
      )}
    >
      {config?.label || status}
    </span>
  )
}
