"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { FileText, DollarSign, MapPin, CheckCircle } from "lucide-react"

type Report = {
  id: string
  customer_name: string
  customer_address: string
  price_quote: number | null
  scope_of_work: string
  status: string
  created_at: string
  contractor_name: string
  job_type: string
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)

      const { data: reportsRaw } = await supabase
        .from("reports")
        .select("id, customer_name, customer_address, price_quote, scope_of_work, status, created_at, contractor_id, job_id")
        .order("created_at", { ascending: false })

      if (!reportsRaw || reportsRaw.length === 0) {
        setLoading(false)
        return
      }

      // Fetch contractor names
      const contractorIds = [...new Set(reportsRaw.map((r: any) => r.contractor_id).filter(Boolean))]
      let profileMap: Record<string, any> = {}
      if (contractorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", contractorIds)
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))
      }

      // Fetch job types
      const jobIds = [...new Set(reportsRaw.map((r: any) => r.job_id).filter(Boolean))]
      let jobMap: Record<string, any> = {}
      if (jobIds.length > 0) {
        const { data: jobs } = await supabase
          .from("jobs")
          .select("id, job_type")
          .in("id", jobIds)
        jobMap = Object.fromEntries((jobs || []).map((j: any) => [j.id, j]))
      }

      setReports(reportsRaw.map((r: any) => ({
        id: r.id,
        customer_name: r.customer_name,
        customer_address: r.customer_address,
        price_quote: r.price_quote,
        scope_of_work: r.scope_of_work,
        status: r.status,
        created_at: r.created_at,
        contractor_name: profileMap[r.contractor_id]?.username || "Unknown",
        job_type: jobMap[r.job_id]?.job_type || "",
      })))

      setLoading(false)
    }

    fetchReports()
  }, [])

  const handleMarkReviewed = async (reportId: string) => {
    const { error } = await supabase
      .from("reports")
      .update({ status: "Reviewed" })
      .eq("id", reportId)

    if (error) {
      alert("Error: " + error.message)
    } else {
      setReports(reports.map((r) => r.id === reportId ? { ...r, status: "Reviewed" } : r))
    }
  }

  const handleMarkCompleted = async (reportId: string) => {
    const { error } = await supabase
      .from("reports")
      .update({ status: "Completed" })
      .eq("id", reportId)

    if (error) {
      alert("Error: " + error.message)
    } else {
      setReports(reports.map((r) => r.id === reportId ? { ...r, status: "Completed" } : r))
    }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "1 day ago"
    return `${days} days ago`
  }

  if (loading) return <p className="p-6">Loading reports...</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Contractor Reports
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View reports submitted by contractors.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
          No reports submitted yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-foreground">
                  <span className="text-xs font-medium text-muted-foreground">Contractor: </span>
                  {report.contractor_name}
                </p>
                {report.job_type && (
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {report.job_type}
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  report.status === "Completed"
                    ? "bg-blue-900/30 text-blue-400 border border-blue-700"
                    : report.status === "Reviewed"
                    ? "bg-emerald-900/30 text-emerald-400 border border-emerald-700"
                    : "bg-amber-900/30 text-amber-400 border border-amber-700"
                }`}>
                  {report.status}
                </span>
                <span className="text-xs text-muted-foreground">{timeAgo(report.created_at)}</span>
              </div>

              <div className="mb-3 flex flex-col gap-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Customer:</span> {report.customer_name}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {report.customer_address}
                </div>
                {report.price_quote && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5" />
                    Quote: ${report.price_quote.toLocaleString()}
                  </div>
                )}
              </div>

              <div className="mb-3 rounded-lg bg-secondary/30 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Scope of Work</p>
                <p className="text-sm text-foreground">{report.scope_of_work}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {report.status === "Pending" && (
                  <button
                    onClick={() => handleMarkReviewed(report.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Mark Reviewed
                  </button>
                )}
                {report.status === "Reviewed" && (
                  <button
                    onClick={() => handleMarkCompleted(report.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-900/30 px-4 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-900/50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Mark Completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
