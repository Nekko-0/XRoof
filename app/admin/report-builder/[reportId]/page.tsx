"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ReportBuilder } from "@/components/report-builder"

export default function AdminReportBuilderPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = use(params)
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {reportId === "new" ? "Create Report" : "Edit Report"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Build a professional roof estimate report.
        </p>
      </div>

      <ReportBuilder
        reportId={reportId}
        onSaved={(id) => router.replace(`/admin/report-builder/${id}`)}
        onPreview={(id) => window.open(`/admin/report-view/${id}`, "_blank")}
      />
    </div>
  )
}
