import { cn } from "@/lib/utils"

type JobStatus = "pending" | "negotiating" | "assigned" | "accepted" | "completed" | "cancelled"

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-900/30 text-amber-400 border-amber-700",
  },
  negotiating: {
    label: "Negotiating",
    className: "bg-red-900/30 text-red-400 border-red-700",
  },
  assigned: {
    label: "Assigned",
    className: "bg-blue-900/30 text-blue-400 border-blue-700",
  },
  accepted: {
    label: "Accepted",
    className: "bg-yellow-900/30 text-yellow-400 border-yellow-700",
  },
  completed: {
    label: "Job Completed",
    className: "bg-emerald-900/30 text-emerald-400 border-emerald-700",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-800/30 text-gray-400 border-gray-600",
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
