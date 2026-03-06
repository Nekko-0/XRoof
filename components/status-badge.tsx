import { cn } from "@/lib/utils"

type JobStatus = "negotiating" | "accepted" | "completed"

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  negotiating: {
    label: "Negotiating",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  accepted: {
    label: "Accepted",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  completed: {
    label: "Job Completed",
    className: "bg-green-50 text-green-700 border-green-200",
  },
}

export function StatusBadge({ status }: { status: string }) {
  const key = status as JobStatus
  const config = statusConfig[key] || statusConfig["negotiating"]
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
