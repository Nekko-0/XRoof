"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ReportBuilder } from "@/components/report-builder"
import { ArrowLeft } from "lucide-react"
import { Suspense } from "react"

function ReportBuilderInner() {
  const searchParams = useSearchParams()
  const reportId = searchParams.get("id") || "new"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/contractor/reports" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              {reportId === "new" ? "Create Report" : "Edit Report"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Build your own professional roof estimate report.
            </p>
          </div>
        </div>
      </div>

      <ReportBuilder
        reportId={reportId}
        onSaved={() => {}}
        onPreview={(id) => window.open(`/contractor/report-view/${id}`, "_blank")}
      />
    </div>
  )
}

export default function ContractorReportBuilderPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 rounded-xl bg-secondary/50" />}>
      <ReportBuilderInner />
    </Suspense>
  )
}
