"use client"

import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function ContractorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" />
        <h2 className="mb-2 text-lg font-bold text-foreground">Something went wrong</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          This page encountered an error. Your data is safe — try refreshing or go back to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <Link
            href="/contractor/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
