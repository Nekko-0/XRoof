import { cn } from "@/lib/utils"

type JobStatus = "pending" | "negotiating" | "assigned" | "accepted" | "completed" | "cancelled"

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  negotiating: {
    label: "Negotiating",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  assigned: {
    label: "Assigned",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  accepted: {
    label: "Accepted",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  completed: {
    label: "Job Completed",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-50 text-gray-700 border-gray-200",
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
