"use client"

import { useRouter } from "next/navigation"
import { RoofMeasureTool, RoofMeasurement } from "@/components/roof-measure-tool"

export default function ContractorMeasurePage() {
  const router = useRouter()

  const handleExport = (data: RoofMeasurement) => {
    sessionStorage.setItem("measurement_data", JSON.stringify(data))
    router.push("/contractor/report-builder")
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
