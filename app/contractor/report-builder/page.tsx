"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ReportBuilder } from "@/components/report-builder"
import { FileText } from "lucide-react"

export default function ContractorReportBuilderPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Create Report
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Build your own professional roof estimate report.
          </p>
        </div>
        <Link
          href="/contractor/report"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <FileText className="h-4 w-4" />
          Request Pro Report — $30
        </Link>
      </div>

      <ReportBuilder
        reportId="new"
        onSaved={() => {}}
        onPreview={(id) => window.open(`/admin/report-view/${id}`, "_blank")}
      />
    </div>
  )
}
