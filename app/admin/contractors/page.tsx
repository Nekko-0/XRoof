"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { MapPin, Mail, Phone, Briefcase, Search } from "lucide-react"

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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
