"use client"

import { useEffect, useState } from "react"
import { useRole } from "@/lib/role-context"
import { useToast } from "@/lib/toast-context"
import { authFetch } from "@/lib/auth-fetch"
import { EmptyState } from "@/components/empty-state"
import { exportCSV } from "@/lib/csv-export"
import {
  UserCircle, Plus, Search, Mail, Phone, MapPin, X,
  ChevronDown, ChevronUp, Download, Trash2, Edit3, Check,
} from "lucide-react"

type Customer = {
  id: string
  contractor_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
}

type Job = {
  id: string
  address: string
  status: string
  job_type: string
  budget: number | null
  created_at: string
  customer_name?: string
}

export default function CustomersPage() {
  const { accountId } = useRole()
  const toast = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [segment, setSegment] = useState<"all" | "active" | "completed" | "high_value">("all")
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [customerJobs, setCustomerJobs] = useState<Job[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)

  // New customer form
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [saving, setSaving] = useState(false)

  // Edit mode
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhone, setEditPhone] = useState("")

  useEffect(() => {
    if (!accountId) return
    const load = async () => {
      const [custRes, jobsRes] = await Promise.all([
        authFetch(`/api/customers?contractor_id=${accountId}`),
        authFetch(`/api/jobs/by-contractor`),
      ])
      const data = await custRes.json()
      const jobsData = await jobsRes.json()
      setCustomers(Array.isArray(data) ? data : [])
      setAllJobs(Array.isArray(jobsData) ? jobsData : [])
      setLoading(false)
    }
    load()
  }, [accountId])

  // Per-customer stats from allJobs
  const customerStats = (name: string) => {
    const jobs = allJobs.filter((j) => j.customer_name === name)
    const totalSpend = jobs.reduce((sum, j) => sum + (j.budget || 0), 0)
    const hasActive = jobs.some((j) => !["Completed", "Lost"].includes(j.status))
    const hasCompleted = jobs.some((j) => j.status === "Completed")
    return { totalSpend, hasActive, hasCompleted, jobCount: jobs.length }
  }

  const handleAdd = async () => {
    if (!formName.trim() || !accountId) return
    setSaving(true)
    const res = await authFetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractor_id: accountId,
        name: formName.trim(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        address: formAddress.trim() || null,
        notes: formNotes.trim() || null,
      }),
    })
    const data = await res.json()
    if (data.id) {
      setCustomers((prev) => [data, ...prev])
      setFormName(""); setFormEmail(""); setFormPhone(""); setFormAddress(""); setFormNotes("")
      setShowForm(false)
      toast.success("Customer added")
    } else {
      toast.error(data.error || "Failed to add customer")
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer?")) return
    await authFetch(`/api/customers?id=${id}`, { method: "DELETE" })
    setCustomers((prev) => prev.filter((c) => c.id !== id))
    toast.success("Customer deleted")
  }

  const handleExpand = async (c: Customer) => {
    if (expandedId === c.id) { setExpandedId(null); return }
    setExpandedId(c.id)
    setLoadingJobs(true)

    // Find jobs matching this customer's name
    const { data } = await supabase
      .from("jobs")
      .select("id, address, status, job_type, budget, created_at")
      .eq("contractor_id", accountId)
      .eq("customer_name", c.name)
      .order("created_at", { ascending: false })

    setCustomerJobs(data || [])
    setLoadingJobs(false)
  }

  const handleSaveEdit = async (id: string) => {
    const res = await authFetch("/api/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editName, email: editEmail || null, phone: editPhone || null }),
    })
    const data = await res.json()
    if (data.id) {
      setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c))
      setEditId(null)
      toast.success("Customer updated")
    }
  }

  const handleExport = () => {
    exportCSV(
      "xroof-customers",
      ["Name", "Email", "Phone", "Address", "Notes", "Created"],
      customers.map((c) => [c.name, c.email, c.phone, c.address, c.notes, c.created_at?.slice(0, 10)])
    )
    toast.success("CSV exported")
  }

  const filtered = customers.filter((c) => {
    // Search filter
    if (search) {
      const q = search.toLowerCase()
      const matchesSearch = c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.address?.toLowerCase().includes(q)
      if (!matchesSearch) return false
    }
    // Segment filter
    if (segment !== "all") {
      const stats = customerStats(c.name)
      if (segment === "active" && !stats.hasActive) return false
      if (segment === "completed" && !stats.hasCompleted) return false
      if (segment === "high_value" && stats.totalSpend < 10000) return false
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Customers
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {customers.length} customer{customers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {customers.length > 0 && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* Search */}
      {customers.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, address..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Segment Filters */}
      {customers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {([
            { key: "all", label: "All" },
            { key: "active", label: "Active Jobs" },
            { key: "completed", label: "Completed" },
            { key: "high_value", label: "High Value ($10k+)" },
          ] as const).map((s) => (
            <button
              key={s.key}
              onClick={() => setSegment(s.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                segment === s.key
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Add Customer Form */}
      {showForm && (
        <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <Plus className="h-4 w-4 text-primary" /> New Customer
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name *</label>
              <input
                value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="John Smith"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                placeholder="john@email.com"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
              <input
                value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
              <input
                value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
                placeholder="123 Main St, Chicago, IL"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
            <input
              value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Optional notes..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleAdd} disabled={!formName.trim() || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Saving..." : "Add Customer"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Customer List */}
      {filtered.length === 0 && !showForm ? (
        customers.length === 0 ? (
          <EmptyState
            icon={UserCircle}
            title="No customers yet"
            description="Customers are automatically created when you add jobs. You can also add them manually."
            actionLabel="Add Customer"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">No customers match "{search}"</p>
        )
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {editId === c.id ? (
                    <div className="flex gap-2">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground" />
                      <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email"
                        className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground" />
                      <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone"
                        className="w-28 rounded border border-border bg-background px-2 py-1 text-xs text-foreground" />
                      <button onClick={() => handleSaveEdit(c.id)} className="text-emerald-600 hover:text-emerald-300">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditId(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground truncate">{c.name}</p>
                        {customerStats(c.name).totalSpend > 0 && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            ${customerStats(c.name).totalSpend.toLocaleString()}
                          </span>
                        )}
                        {customerStats(c.name).jobCount > 1 && (
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                            Repeat
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>}
                        {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>}
                        {c.address && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /> {c.address}</span>}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditId(c.id); setEditName(c.name); setEditEmail(c.email || ""); setEditPhone(c.phone || "") }}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(c.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleExpand(c)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                    {expandedId === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded — job history */}
              {expandedId === c.id && (
                <div className="border-t border-border bg-secondary/20 p-4">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Job History</h4>
                  {loadingJobs ? (
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  ) : customerJobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60">No jobs found for this customer</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {customerJobs.map((j) => (
                        <div key={j.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                          <div>
                            <p className="text-xs font-medium text-foreground">{j.address}</p>
                            <p className="text-[10px] text-muted-foreground">{j.job_type} · {j.created_at?.slice(0, 10)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {j.budget && <span className="text-xs font-bold text-foreground">${j.budget.toLocaleString()}</span>}
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold text-white ${
                              j.status === "Completed" ? "bg-emerald-500" :
                              j.status === "In Progress" ? "bg-blue-500" :
                              "bg-amber-500"
                            }`}>{j.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
