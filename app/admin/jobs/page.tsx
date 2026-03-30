"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { MapPin, DollarSign, UserPlus, Check, Plus, Phone, UserMinus, ScrollText } from "lucide-react"
import Link from "next/link"
import { StatusBadge } from "@/components/status-badge"

type Lead = {
  id: string
  customer_name: string
  customer_phone: string
  address: string
  zip_code: string
  job_type: string
  description: string
  budget: number | null
  status: string
  created_at: string
  contractor_name: string | null
  contractor_email: string | null
  signature_url: string | null
  signed_at: string | null
}

type Contractor = {
  id: string
  username: string
  email: string
  company_name: string
  service_zips: string[]
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [selectedContractor, setSelectedContractor] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // New lead form
  const [newLead, setNewLead] = useState({
    customer_name: "",
    customer_phone: "",
    address: "",
    zip_code: "",
    job_type: "",
    description: "",
    budget: "",
  })

  const fetchData = async () => {
    setLoading(true)

    const { data: jobsRaw } = await supabase
      .from("jobs")
      .select("id, address, zip_code, job_type, description, budget, status, created_at, contractor_id, customer_name, customer_phone, signature_url, signed_at")
      .order("created_at", { ascending: false })

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, email, company_name, role, service_zips")

    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))

    const contractorList = (profiles || [])
      .filter((p: any) => p.role === "Contractor")
      .map((p: any) => ({
        id: p.id,
        username: p.username || "Unknown",
        email: p.email || "",
        company_name: p.company_name || "",
        service_zips: p.service_zips || [],
      }))
    setContractors(contractorList)

    setLeads((jobsRaw || []).map((j: any) => ({
      id: j.id,
      customer_name: j.customer_name || "Unknown",
      customer_phone: j.customer_phone || "",
      address: j.address,
      zip_code: j.zip_code,
      job_type: j.job_type,
      description: j.description,
      budget: j.budget,
      status: j.status,
      created_at: j.created_at,
      contractor_name: j.contractor_id ? (profileMap[j.contractor_id]?.username || "Unknown") : null,
      contractor_email: j.contractor_id ? (profileMap[j.contractor_id]?.email || "") : null,
      signature_url: j.signature_url || null,
      signed_at: j.signed_at || null,
    })))

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleAddLead = async () => {
    if (!newLead.customer_name || !newLead.address || !newLead.zip_code || !newLead.job_type) {
      alert("Please fill in customer name, address, zip code, and job type")
      return
    }

    setSaving(true)
    const { error } = await supabase.from("jobs").insert({
      customer_name: newLead.customer_name,
      customer_phone: newLead.customer_phone,
      address: newLead.address,
      zip_code: newLead.zip_code,
      job_type: newLead.job_type,
      description: newLead.description,
      budget: newLead.budget ? Number(newLead.budget) : null,
      status: "Pending",
    })

    if (error) {
      alert("Error adding lead: " + error.message)
    } else {
      setNewLead({ customer_name: "", customer_phone: "", address: "", zip_code: "", job_type: "", description: "", budget: "" })
      setShowForm(false)
      await fetchData()
    }
    setSaving(false)
  }

  const handleAssign = async (jobId: string) => {
    const contractorId = selectedContractor[jobId]
    if (!contractorId) {
      alert("Please select a contractor first")
      return
    }

    setAssigning(jobId)
    const { error } = await supabase
      .from("jobs")
      .update({ contractor_id: contractorId, status: "Assigned", accepted_at: new Date().toISOString() })
      .eq("id", jobId)

    if (error) {
      alert("Error assigning lead: " + error.message)
    } else {
      const contractor = contractors.find((c) => c.id === contractorId)
      const lead = leads.find((j) => j.id === jobId)
      setLeads(leads.map((j) =>
        j.id === jobId
          ? { ...j, status: "Assigned", contractor_name: contractor?.username || "Unknown", contractor_email: contractor?.email || "" }
          : j
      ))

      // Send in-app notification to contractor
      const notifTitle = "New Lead Assigned"
      const notifBody = `New lead: ${lead?.job_type} at ${lead?.address}`
      await supabase.from("notifications").insert({
        user_id: contractorId,
        type: "lead_assigned",
        title: notifTitle,
        body: notifBody,
        read: false,
      })

      // Send real push notification to contractor's phone
      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: contractorId, title: notifTitle, body: notifBody }),
      }).catch(() => {})
    }
    setAssigning(null)
  }

  const handleUnassign = async (jobId: string) => {
    if (!confirm("Remove this contractor and reassign the lead? This will delete any existing contract.")) return

    setAssigning(jobId)

    // Delete any contracts for this job
    await supabase.from("contracts").delete().eq("job_id", jobId)

    // Clear job assignment, signature, and status
    const { error } = await supabase
      .from("jobs")
      .update({ contractor_id: null, status: "Pending", signature_url: null, signed_at: null, accepted_at: null, estimate_sent_at: null, completed_at: null })
      .eq("id", jobId)

    if (error) {
      alert("Error removing contractor: " + error.message)
    } else {
      setLeads(leads.map((j) =>
        j.id === jobId
          ? { ...j, status: "Pending", contractor_name: null, contractor_email: null, signature_url: null, signed_at: null }
          : j
      ))
    }
    setAssigning(jobId)
    setAssigning(null)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "1 day ago"
    if (days < 7) return `${days} days ago`
    return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`
  }

  const getMatchingContractors = (jobZip: string) => {
    const matching = contractors.filter((c) => c.service_zips.includes(jobZip))
    const others = contractors.filter((c) => !c.service_zips.includes(jobZip))
    return { matching, others }
  }

  const filteredLeads = statusFilter === "all"
    ? leads
    : leads.filter((j) => j.status === statusFilter)

  if (loading) return <p className="p-6">Loading leads...</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Leads
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add leads and assign them to contractors.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Lead
        </button>
      </div>

      {/* Add Lead Form */}
      {showForm && (
        <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">New Lead</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Customer Name *</label>
              <input
                value={newLead.customer_name}
                onChange={(e) => setNewLead({ ...newLead, customer_name: e.target.value })}
                placeholder="John Smith"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Phone</label>
              <input
                value={newLead.customer_phone}
                onChange={(e) => setNewLead({ ...newLead, customer_phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Address *</label>
              <input
                value={newLead.address}
                onChange={(e) => setNewLead({ ...newLead, address: e.target.value })}
                placeholder="123 Main St"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Zip Code *</label>
              <input
                value={newLead.zip_code}
                onChange={(e) => setNewLead({ ...newLead, zip_code: e.target.value })}
                placeholder="90210"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Job Type *</label>
              <select
                value={newLead.job_type}
                onChange={(e) => setNewLead({ ...newLead, job_type: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select...</option>
                <option value="Roof Replacement">Roof Replacement</option>
                <option value="Roof Repair">Roof Repair</option>
                <option value="Roof Inspection">Roof Inspection</option>
                <option value="New Construction">New Construction</option>
                <option value="Storm Damage">Storm Damage</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Budget</label>
              <input
                type="number"
                value={newLead.budget}
                onChange={(e) => setNewLead({ ...newLead, budget: e.target.value })}
                placeholder="5000"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-foreground">Description</label>
              <textarea
                value={newLead.description}
                onChange={(e) => setNewLead({ ...newLead, description: e.target.value })}
                placeholder="Describe the job..."
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddLead}
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Lead"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {["all", "Pending", "Assigned", "Accepted", "Completed"].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f === "all" ? "All" : f} {f !== "all" && `(${leads.filter((j) => j.status === f).length})`}
          </button>
        ))}
      </div>

      {filteredLeads.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
          No leads found. Click &ldquo;Add Lead&rdquo; to create one.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredLeads.map((lead) => {
            const { matching, others } = getMatchingContractors(lead.zip_code)
            return (
              <div key={lead.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-foreground">{lead.customer_name}</p>
                  {lead.customer_phone && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {lead.customer_phone}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {lead.address}, {lead.zip_code}
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {lead.job_type}
                  </span>
                  <StatusBadge status={lead.status} />
                  {lead.budget && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${lead.budget.toLocaleString()}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">{timeAgo(lead.created_at)}</span>
                </div>

                {lead.description && (
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{lead.description}</p>
                )}

                {(lead.signed_at || lead.status === "Accepted" || lead.status === "Completed") && (
                  <div className="mb-3">
                    <Link
                      href={`/admin/contract/${lead.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/30"
                    >
                      <ScrollText className="h-3 w-3" />
                      View Contract
                    </Link>
                  </div>
                )}

                {lead.contractor_name ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-primary">
                        Assigned to <strong>{lead.contractor_name}</strong>
                        {lead.contractor_email && <span className="ml-1 font-normal">({lead.contractor_email})</span>}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnassign(lead.id)}
                      disabled={assigning === lead.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      {assigning === lead.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedContractor[lead.id] || ""}
                      onChange={(e) => setSelectedContractor({ ...selectedContractor, [lead.id]: e.target.value })}
                      className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select contractor...</option>
                      {matching.length > 0 && (
                        <optgroup label={`Zip ${lead.zip_code} (matching)`}>
                          {matching.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.username} — {c.email}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="All contractors">
                        {others.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.username} — {c.email}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <button
                      onClick={() => handleAssign(lead.id)}
                      disabled={assigning === lead.id || !selectedContractor[lead.id]}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {assigning === lead.id ? "Assigning..." : "Assign"}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
