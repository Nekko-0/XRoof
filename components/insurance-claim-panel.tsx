"use client"

import { useState, useEffect } from "react"
import { authFetch } from "@/lib/auth-fetch"
import { useToast } from "@/lib/toast-context"
import { Shield, Save, Loader2, Phone, Mail, Calendar, DollarSign, FileText } from "lucide-react"

type ClaimData = {
  is_insurance_claim: boolean
  insurance_company: string
  claim_number: string
  adjuster_name: string
  adjuster_phone: string
  adjuster_email: string
  deductible: number | null
  claim_status: string
  adjuster_meeting_date: string | null
  insurance_notes: string
}

const CLAIM_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "filed", label: "Filed" },
  { value: "adjuster_scheduled", label: "Adjuster Scheduled" },
  { value: "adjuster_visited", label: "Adjuster Visited" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "supplement_filed", label: "Supplement Filed" },
  { value: "closed", label: "Closed" },
]

export function InsuranceClaimPanel({ jobId }: { jobId: string }) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<ClaimData>({
    is_insurance_claim: false,
    insurance_company: "",
    claim_number: "",
    adjuster_name: "",
    adjuster_phone: "",
    adjuster_email: "",
    deductible: null,
    claim_status: "pending",
    adjuster_meeting_date: null,
    insurance_notes: "",
  })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch(`/api/jobs/insurance?job_id=${jobId}`)
        const json = await res.json()
        if (json.id) {
          setData({
            is_insurance_claim: json.is_insurance_claim || false,
            insurance_company: json.insurance_company || "",
            claim_number: json.claim_number || "",
            adjuster_name: json.adjuster_name || "",
            adjuster_phone: json.adjuster_phone || "",
            adjuster_email: json.adjuster_email || "",
            deductible: json.deductible || null,
            claim_status: json.claim_status || "pending",
            adjuster_meeting_date: json.adjuster_meeting_date || null,
            insurance_notes: json.insurance_notes || "",
          })
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [jobId])

  const save = async () => {
    setSaving(true)
    try {
      const res = await authFetch("/api/jobs/insurance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, ...data }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Insurance info saved")
      } else {
        toast.error(json.error || "Failed to save")
      }
    } catch {
      toast.error("Failed to save")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading insurance info...
        </div>
      </div>
    )
  }

  if (!data.is_insurance_claim) {
    return (
      <button
        onClick={() => setData({ ...data, is_insurance_claim: true })}
        className="flex items-center gap-2 rounded-xl border border-dashed border-blue-500/30 bg-blue-500/5 px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-500/10 transition-colors w-full"
      >
        <Shield className="h-4 w-4" /> Mark as Insurance Claim
      </button>
    )
  }

  const statusColor = {
    pending: "text-gray-500",
    filed: "text-blue-600",
    adjuster_scheduled: "text-amber-600",
    adjuster_visited: "text-purple-400",
    approved: "text-emerald-600",
    denied: "text-red-600",
    supplement_filed: "text-orange-400",
    closed: "text-gray-500",
  }[data.claim_status] || "text-gray-500"

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
          <Shield className="h-3.5 w-3.5" /> Insurance Claim
        </h4>
        <span className={`text-[10px] font-bold uppercase ${statusColor}`}>
          {CLAIM_STATUSES.find((s) => s.value === data.claim_status)?.label || data.claim_status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Insurance Company</label>
          <input
            value={data.insurance_company}
            onChange={(e) => setData({ ...data, insurance_company: e.target.value })}
            placeholder="State Farm, Allstate..."
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Claim #</label>
          <input
            value={data.claim_number}
            onChange={(e) => setData({ ...data, claim_number: e.target.value })}
            placeholder="CLM-123456"
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Adjuster Name</label>
          <input
            value={data.adjuster_name}
            onChange={(e) => setData({ ...data, adjuster_name: e.target.value })}
            placeholder="John Smith"
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Adjuster Phone</label>
          <input
            value={data.adjuster_phone}
            onChange={(e) => setData({ ...data, adjuster_phone: e.target.value })}
            placeholder="555-123-4567"
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Deductible</label>
          <input
            type="number"
            value={data.deductible || ""}
            onChange={(e) => setData({ ...data, deductible: e.target.value ? Number(e.target.value) : null })}
            placeholder="1000"
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Claim Status</label>
          <select
            value={data.claim_status}
            onChange={(e) => setData({ ...data, claim_status: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {CLAIM_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Adjuster Meeting</label>
          <input
            type="date"
            value={data.adjuster_meeting_date || ""}
            onChange={(e) => setData({ ...data, adjuster_meeting_date: e.target.value || null })}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Adjuster Email</label>
          <input
            value={data.adjuster_email}
            onChange={(e) => setData({ ...data, adjuster_email: e.target.value })}
            placeholder="adjuster@insurance.com"
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Notes</label>
        <textarea
          value={data.insurance_notes}
          onChange={(e) => setData({ ...data, insurance_notes: e.target.value })}
          rows={2}
          placeholder="Claim details, supplement notes..."
          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => setData({ ...data, is_insurance_claim: false })}
          className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
        >
          Remove claim
        </button>
      </div>
    </div>
  )
}
