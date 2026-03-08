"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { FileText, DollarSign, MapPin, Plus } from "lucide-react"

type AssignedJob = {
  id: string
  customer_name: string
  address: string
  zip_code: string
  job_type: string
}

export default function ContractorReportPage() {
  const router = useRouter()

  const [jobs, setJobs] = useState<AssignedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [selectedJobId, setSelectedJobId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [priceQuote, setPriceQuote] = useState("")
  const [scopeOfWork, setScopeOfWork] = useState("")

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      const user = session.user

      const { data } = await supabase
        .from("jobs")
        .select("id, customer_name, address, zip_code, job_type")
        .eq("contractor_id", user.id)
        .in("status", ["Assigned", "Accepted"])

      setJobs(data || [])
      setLoading(false)
    }

    fetchJobs()
  }, [])

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId)
    const job = jobs.find((j) => j.id === jobId)
    if (job) {
      setCustomerName(job.customer_name || "")
      setCustomerAddress(`${job.address}, ${job.zip_code}`)
    }
  }

  const handleSubmit = async () => {
    if (!selectedJobId || !customerName || !customerAddress || !scopeOfWork) {
      alert("Please fill in all required fields")
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const user = session.user

    const job = jobs.find((j) => j.id === selectedJobId)

    setSaving(true)
    const res = await fetch("/api/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractorName: user.user_metadata?.username || user.email?.split("@")[0] || "Contractor",
        customerName,
        customerAddress,
        jobType: job?.job_type || "",
        priceQuote,
        scopeOfWork,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      alert("Error sending report: " + (data.error || "Unknown error"))
    } else {
      alert("Report sent successfully!")
      router.push("/contractor/dashboard")
    }
    setSaving(false)
  }

  if (loading) return <p className="p-6">Loading...</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Request Report
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Request a job report with your pricing and scope of work. A detailed report will be generated and sent to your email.
        </p>
      </div>

      <Link
        href="/contractor/report-builder"
        className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        <Plus className="h-4 w-4" />
        Or Create Your Own Report
      </Link>

      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          {/* Select Job */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              <FileText className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
              Select Job *
            </label>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assigned jobs to report on.</p>
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => handleJobSelect(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select a job...</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.customer_name || "Customer"} — {j.job_type} — {j.address}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Customer Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Customer Name *</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Address */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              <MapPin className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
              Address *
            </label>
            <input
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="123 Main St, 90210"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Price Quote */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              <DollarSign className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
              Price / Quote
            </label>
            <input
              type="number"
              value={priceQuote}
              onChange={(e) => setPriceQuote(e.target.value)}
              placeholder="5000"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Scope of Work */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Scope of Work *</label>
            <textarea
              value={scopeOfWork}
              onChange={(e) => setScopeOfWork(e.target.value)}
              placeholder="Describe what will be done on the job..."
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving || !selectedJobId}
            className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Request Report"}
          </button>
        </div>
      </div>
    </div>
  )
}
