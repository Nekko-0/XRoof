"use client"

import { useState, useEffect } from "react"
import { useRole } from "@/lib/role-context"
import { supabase } from "@/lib/supabaseClient"
import { MaterialCalculator, type MaterialLine } from "@/components/material-calculator"
import { useToast } from "@/lib/toast-context"
import { Calculator, FileText } from "lucide-react"

export default function MaterialsPage() {
  const { accountId, loading: roleLoading } = useRole()
  const toast = useToast()
  const [jobs, setJobs] = useState<{ id: string; customer_name: string; address: string; budget: number | null }[]>([])
  const [selectedJob, setSelectedJob] = useState("")
  const [jobData, setJobData] = useState<{ roofArea: number; pitch: string }>({ roofArea: 0, pitch: "4/12" })

  // Load active jobs for picker
  useEffect(() => {
    if (roleLoading || !accountId) return
    const load = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, customer_name, address, budget")
        .eq("contractor_id", accountId)
        .not("status", "in", '("Completed","Lost")')
        .order("created_at", { ascending: false })
        .limit(50)
      setJobs(data || [])
    }
    load()
  }, [accountId, roleLoading])

  // Load report data for selected job
  useEffect(() => {
    if (!selectedJob) {
      setJobData({ roofArea: 0, pitch: "4/12" })
      return
    }
    const load = async () => {
      const { data: report } = await supabase
        .from("reports")
        .select("roof_squares, roof_pitch, measurement_data")
        .eq("job_id", selectedJob)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (report) {
        const area = report.roof_squares ? report.roof_squares * 100 : 0
        setJobData({
          roofArea: report.measurement_data?.total_area || area,
          pitch: report.roof_pitch || "4/12",
        })
      } else {
        // No report linked by job_id — check if job has measurement data
        const { data: job } = await supabase
          .from("jobs")
          .select("measurement_data, address")
          .eq("id", selectedJob)
          .single()
        if (job?.measurement_data?.total_area) {
          setJobData({
            roofArea: job.measurement_data.total_area,
            pitch: job.measurement_data.pitch || "4/12",
          })
        } else if (job?.address) {
          // Build a fuzzy pattern from the house number for address matching
          const houseNum = job.address.match(/^(\d+)/)?.[1] || ""
          const fuzzyPattern = houseNum ? `%${houseNum}%` : `%${job.address.split(" ").slice(0, 2).join("%")}%`

          // Try matching a report by customer address (fuzzy)
          const { data: addrReport } = await supabase
            .from("reports")
            .select("roof_squares, roof_pitch, measurement_data")
            .ilike("customer_address", fuzzyPattern)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          if (addrReport) {
            const area = addrReport.roof_squares ? addrReport.roof_squares * 100 : 0
            setJobData({
              roofArea: addrReport.measurement_data?.total_area || area,
              pitch: addrReport.roof_pitch || "4/12",
            })
          } else {
            // Try matching a saved measurement by address (fuzzy)
            const { data: measurement } = await supabase
              .from("measurements")
              .select("adjusted_area, pitch")
              .ilike("address", fuzzyPattern)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
            if (measurement?.adjusted_area) {
              setJobData({
                roofArea: measurement.adjusted_area,
                pitch: measurement.pitch || "4/12",
              })
            }
          }
        }
      }
    }
    load()
  }, [selectedJob])

  const handleExportToEstimate = (materials: MaterialLine[]) => {
    // Store materials data in sessionStorage for the report builder to pick up
    const estimateItems = materials.map((m) => ({
      description: `${m.item} (${m.quantity} ${m.unit})`,
      quantity: 1,
      unit_price: m.total,
    }))
    sessionStorage.setItem("material_estimate_items", JSON.stringify(estimateItems))
    toast.success("Material costs copied! Open Report Builder to paste into estimate.")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Material Calculator
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Calculate material quantities and costs for any roofing job. Customize prices to match your supplier.
        </p>
      </div>

      {/* Job Picker */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Auto-fill from Job (optional)
        </label>
        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">Enter measurements manually</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.customer_name} — {j.address}
            </option>
          ))}
        </select>
        {selectedJob && jobData.roofArea === 0 && (
          <p className="mt-2 text-xs text-amber-600">No measurement data found for this job. Enter roof area manually below, or use the Measure tool first.</p>
        )}
      </div>

      <MaterialCalculator
        roofAreaSqft={jobData.roofArea}
        pitch={jobData.pitch}
        onExport={handleExportToEstimate}
      />

      {/* Quick Reference */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Calculator className="h-4 w-4 text-primary" /> Quick Reference
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs text-muted-foreground">
          <div>
            <p className="mb-1.5 font-semibold text-foreground">Coverage Rates</p>
            <ul className="space-y-1">
              <li>1 square = 100 sqft of roof area</li>
              <li>3 bundles = 1 square of shingles</li>
              <li>1 roll underlayment = ~4 squares</li>
              <li>1 roll starter strip = ~120 linear ft</li>
              <li>1 ridge cap bundle = ~33 linear ft</li>
            </ul>
          </div>
          <div>
            <p className="mb-1.5 font-semibold text-foreground">Waste Factors</p>
            <ul className="space-y-1">
              <li>Simple gable roof: 10-12%</li>
              <li>Hip roof: 15-18%</li>
              <li>Complex cut-up roof: 18-22%</li>
              <li>Mansard/steep pitch: 20-25%</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
