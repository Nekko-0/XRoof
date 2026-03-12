"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import { FileText, DollarSign, MapPin, Plus, Phone, Briefcase, StickyNote, User, Mail, CheckCircle, Sparkles } from "lucide-react"
import { useToast } from "@/lib/toast-context"

type AssignedJob = {
  id: string
  customer_name: string
  customer_phone: string
  address: string
  zip_code: string
  job_type: string
}

export default function ContractorReportPage() {
  const router = useRouter()
  const toast = useToast()
  const searchParams = useSearchParams()

  const [jobs, setJobs] = useState<AssignedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [userId, setUserId] = useState("")

  const [selectedJobId, setSelectedJobId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [jobType, setJobType] = useState("")
  const [priceQuote, setPriceQuote] = useState("")
  const [pricingMode, setPricingMode] = useState<"flat" | "per_sqft">("flat")
  const [scopeOfWork, setScopeOfWork] = useState("")
  const [extraNotes, setExtraNotes] = useState("")
  const [contractorName, setContractorName] = useState("")
  const [contractorEmail, setContractorEmail] = useState("")

  // Handle Stripe success redirect — create the measurement request
  useEffect(() => {
    if (searchParams.get("success") === "true" && !paymentSuccess) {
      const createOrder = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const address = searchParams.get("address") || ""
        const notes = searchParams.get("notes") || ""
        const roofType = searchParams.get("roof_type") || "Residential"

        await authFetch("/api/measurement-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contractor_id: session.user.id,
            address,
            roof_type: roofType,
            urgency: "standard",
            notes,
            report_type: "full",
          }),
        })

        setPaymentSuccess(true)
        // Clean URL
        router.replace("/contractor/report")
      }
      createOrder()
    }
  }, [searchParams, paymentSuccess, router])

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      const user = session.user
      setUserId(user.id)

      const { data } = await supabase
        .from("jobs")
        .select("id, customer_name, customer_phone, address, zip_code, job_type")
        .eq("contractor_id", user.id)
        .in("status", ["Assigned", "Accepted"])

      setJobs(data || [])

      // Pre-fill contractor info from account
      setContractorName(user.user_metadata?.username || user.email?.split("@")[0] || "")
      setContractorEmail(user.email || "")

      setLoading(false)
    }

    fetchJobs()
  }, [])

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId)
    const job = jobs.find((j) => j.id === jobId)
    if (job) {
      setCustomerName(job.customer_name || "")
      setCustomerPhone(job.customer_phone || "")
      setCustomerAddress(`${job.address}, ${job.zip_code}`)
      setJobType(job.job_type || "")
    }
  }

  const handleSubmit = async () => {
    if (!selectedJobId || !customerName || !customerPhone || !customerAddress || !jobType || !scopeOfWork || !priceQuote) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!userId) return

    setSaving(true)

    // Redirect to Stripe Checkout for $30 payment
    const res = await authFetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        plan: "report_full",
        address: customerAddress,
        notes: extraNotes,
        roof_type: jobType,
      }),
    })

    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      toast.error("Error starting checkout: " + (data.error || "Unknown error"))
      setSaving(false)
    }
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

      {/* Payment success banner */}
      {paymentSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-sm font-bold text-green-700">Report ordered successfully!</p>
            <p className="text-xs text-green-600">Your professional report is being prepared. You'll receive it via email.</p>
          </div>
        </div>
      )}

      {/* $30 Full Package pricing banner */}
      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Professional Roof Report</p>
            <p className="text-xs text-muted-foreground">Aerial imagery, full measurements & materials for a personalized report — save time, reduce waste</p>
          </div>
        </div>
        <span className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">
          $30
        </span>
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

          {/* Contractor Info */}
          <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contractor Info (pre-filled from account)</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  <User className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
                  Contractor Name
                </label>
                <input
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="Contractor name"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  <Mail className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
                  Contractor Email
                </label>
                <input
                  type="email"
                  value={contractorEmail}
                  onChange={(e) => setContractorEmail(e.target.value)}
                  placeholder="contractor@email.com"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
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

          {/* Customer Phone */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              <Phone className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
              Customer Number *
            </label>
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(555) 000-0000"
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

          {/* Job Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              <Briefcase className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
              Job Type *
            </label>
            <input
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              placeholder="Roof Replacement, Repair, etc."
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

          {/* Estimated Cost */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                <DollarSign className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
                {pricingMode === "flat" ? "Estimated Cost *" : "Price per Sq Ft *"}
              </label>
              <button
                type="button"
                onClick={() => setPricingMode(pricingMode === "flat" ? "per_sqft" : "flat")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {pricingMode === "flat" ? "Switch to $/sq ft" : "Switch to flat price"}
              </button>
            </div>
            <input
              type="number"
              value={priceQuote}
              onChange={(e) => setPriceQuote(e.target.value)}
              placeholder={pricingMode === "flat" ? "5000" : "4.50"}
              step={pricingMode === "per_sqft" ? "0.01" : "1"}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {pricingMode === "per_sqft" && priceQuote && (
              <p className="mt-1 text-xs text-muted-foreground">
                This rate will be multiplied by total sq ft in the report to calculate the final estimate.
              </p>
            )}
          </div>

          {/* Extra Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              <StickyNote className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
              Extra Notes *
            </label>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Additional notes, special instructions..."
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving || !selectedJobId}
            className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Redirecting to checkout..." : "Request Report — $30"}
          </button>
        </div>
      </div>
    </div>
  )
}
