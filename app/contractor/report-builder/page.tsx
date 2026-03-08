"use client"

import { useRouter } from "next/navigation"
import { ReportBuilder } from "@/components/report-builder"

export default function ContractorReportBuilderPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Create Report
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Build your own professional roof estimate report.
        </p>
      </div>

      <ReportBuilder
        reportId="new"
        onSaved={() => router.push("/contractor/report")}
        onPreview={(id) => window.open(`/admin/report-view/${id}`, "_blank")}
      />
    </div>
  )
}
