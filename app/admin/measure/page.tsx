"use client"

import { useRouter } from "next/navigation"
import { RoofMeasureTool, RoofMeasurement } from "@/components/roof-measure-tool"

export default function AdminMeasurePage() {
  const router = useRouter()

  const handleExport = (data: RoofMeasurement) => {
    // Store measurement data in sessionStorage and navigate to report builder
    sessionStorage.setItem("measurement_data", JSON.stringify(data))
    router.push("/admin/report-builder/new")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Roof Measurement
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Measure roof area using satellite view and estimate pitch from Street View.
        </p>
      </div>

      <RoofMeasureTool onExportToReport={handleExport} />
    </div>
  )
}
