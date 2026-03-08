"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"
import { MapPin, Mail, Phone, Briefcase, Search, ScrollText, ChevronDown, ChevronUp } from "lucide-react"

type ContractorProfile = {
  id: string
  username: string
  company_name: string
  email: string
  phone: string
  service_zips: string[]
  license_number: string
  active_jobs: number
}

export default function AdminContractorsPage() {
  const [contractors, setContractors] = useState<ContractorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [zipFilter, setZipFilter] = useState("")
  const [expandedContractor, setExpandedContractor] = useState<string | null>(null)
  const [contractsMap, setContractsMap] = useState<Record<string, any[]>>({})
  const [loadingContracts, setLoadingContracts] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // Fetch all contractor profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, company_name, email, phone, service_zips, license_number, role")
        .eq("role", "Contractor")
        .order("username")

      if (!profiles || profiles.length === 0) {
        setLoading(false)
        return
      }

      // Count active jobs per contractor
      const contractorIds = profiles.map((p: any) => p.id)
      const { data: jobs } = await supabase
        .from("jobs")
        .select("contractor_id")
        .in("contractor_id", contractorIds)
        .in("status", ["Assigned", "Accepted"])

      const jobCounts: Record<string, number> = {}
      for (const j of jobs || []) {
        jobCounts[j.contractor_id] = (jobCounts[j.contractor_id] || 0) + 1
      }

      setContractors(profiles.map((p: any) => ({
        id: p.id,
        username: p.username || "Unknown",
        company_name: p.company_name || "",
        email: p.email || "",
        phone: p.phone || "",
        service_zips: p.service_zips || [],
        license_number: p.license_number || "",
        active_jobs: jobCounts[p.id] || 0,
      })))

      setLoading(false)
    }

    fetchData()
  }, [])

  const handleToggleContracts = async (contractorId: string) => {
    if (expandedContractor === contractorId) {
      setExpandedContractor(null)
      return
    }
    setExpandedContractor(contractorId)
    if (contractsMap[contractorId]) return

    setLoadingContracts(true)
    try {
      const res = await fetch(`/api/contracts/by-contractor/${contractorId}`)
      const data = await res.json()
      setContractsMap((prev) => ({ ...prev, [contractorId]: data || [] }))
    } catch {
      setContractsMap((prev) => ({ ...prev, [contractorId]: [] }))
    }
    setLoadingContracts(false)
  }

  const filtered = zipFilter
    ? contractors.filter((c) => c.service_zips.some((z) => z.includes(zipFilter)))
    : contractors

  if (loading) return <p className="p-6">Loading contractors...</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          All Contractors
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View all registered contractors and filter by zip code.
        </p>
      </div>

      {/* Zip filter */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter by zip code..."
          value={zipFilter}
          onChange={(e) => setZipFilter(e.target.value)}
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
          {zipFilter ? `No contractors found in zip code "${zipFilter}".` : "No contractors registered yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {c.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.username}</p>
                  {c.company_name && (
                    <p className="text-xs text-muted-foreground">{c.company_name}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                {c.service_zips.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    Zips: {c.service_zips.join(", ")}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    {c.email}
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    {c.phone}
                  </div>
                )}
                {c.license_number && (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-3 w-3" />
                    License: {c.license_number}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {c.active_jobs} active job{c.active_jobs !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => handleToggleContracts(c.id)}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  <ScrollText className="h-3 w-3" />
                  Contracts
                  {expandedContractor === c.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {expandedContractor === c.id && (
                <div className="mt-3 border-t border-border pt-3">
                  {loadingContracts ? (
                    <p className="text-xs text-muted-foreground">Loading contracts...</p>
                  ) : (contractsMap[c.id] || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No contracts yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {(contractsMap[c.id] || []).map((contract: any) => (
                        <Link
                          key={contract.id}
                          href={`/admin/contract/${contract.job_id}`}
                          className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-xs transition-colors hover:bg-secondary/50"
                        >
                          <div>
                            <p className="font-medium text-foreground">{contract.customer_name || "Customer"}</p>
                            <p className="text-muted-foreground">{contract.project_address || "No address"}</p>
                          </div>
                          <div className="text-right">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              contract.status === "signed" ? "bg-emerald-900/30 text-emerald-400" : "bg-amber-900/30 text-amber-400"
                            }`}>
                              {contract.status || "draft"}
                            </span>
                            {contract.contract_date && (
                              <p className="mt-0.5 text-muted-foreground">{new Date(contract.contract_date).toLocaleDateString()}</p>
                            )}
                          </div>
                        </Link>
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
