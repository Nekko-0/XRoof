"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import { MapPin, DollarSign, UserPlus, Check } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"

type Job = {
  id: string
  address: string
  zip_code: string
  job_type: string
  description: string
  budget: number | null
  status: string
  created_at: string
  photo_urls?: string[]
  homeowner_name: string
  contractor_name: string | null
}

type Contractor = {
  id: string
  username: string
  company_name: string
  zip_code: string
}

export default function AdminJobsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [jobs, setJobs] = useState<Job[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [selectedContractor, setSelectedContractor] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // Fetch all jobs
      const { data: jobsRaw } = await supabase
        .from("jobs")
        .select("id, address, zip_code, job_type, description, budget, status, created_at, homeowner_id, contractor_id, photo_urls")
        .order("created_at", { ascending: false })

      // Fetch all user profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, company_name, role, zip_code")

      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))

      // Set contractors list
      const contractorList = (profiles || [])
        .filter((p: any) => p.role === "Contractor")
        .map((p: any) => ({
          id: p.id,
          username: p.username || "Unknown",
          company_name: p.company_name || "",
          zip_code: p.zip_code || "",
        }))
      setContractors(contractorList)

      // Map jobs with names
      setJobs((jobsRaw || []).map((j: any) => ({
        id: j.id,
        address: j.address,
        zip_code: j.zip_code,
        job_type: j.job_type,
        description: j.description,
        budget: j.budget,
        status: j.status,
        created_at: j.created_at,
        photo_urls: j.photo_urls,
        homeowner_name: profileMap[j.homeowner_id]?.username || "Unknown",
        contractor_name: j.contractor_id ? (profileMap[j.contractor_id]?.username || "Unknown") : null,
      })))

      setLoading(false)
    }

    fetchData()
  }, [])

  const handleAssign = async (jobId: string) => {
    const contractorId = selectedContractor[jobId]
    if (!contractorId) {
      alert("Please select a contractor first")
      return
    }

    setAssigning(jobId)
    const { error } = await supabase
      .from("jobs")
      .update({ contractor_id: contractorId, status: "Assigned" })
      .eq("id", jobId)

    if (error) {
      alert("Error assigning job: " + error.message)
    } else {
      const contractor = contractors.find((c) => c.id === contractorId)
      setJobs(jobs.map((j) =>
        j.id === jobId
          ? { ...j, status: "Assigned", contractor_name: contractor?.username || "Unknown" }
          : j
      ))
    }
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

  // Filter contractors by matching zip code for a job
  const getMatchingContractors = (jobZip: string) => {
    const matching = contractors.filter((c) => c.zip_code === jobZip)
    const others = contractors.filter((c) => c.zip_code !== jobZip)
    return { matching, others }
  }

  const filteredJobs = statusFilter === "all"
    ? jobs
    : jobs.filter((j) => j.status === statusFilter)

  if (loading) return <p className="p-6">Loading jobs...</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          All Jobs
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View all posted jobs and assign contractors.
        </p>
      </div>

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
            {f === "all" ? "All" : f} {f !== "all" && `(${jobs.filter((j) => j.status === f).length})`}
          </button>
        ))}
      </div>

      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
          No jobs found.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredJobs.map((job) => {
            const { matching, others } = getMatchingContractors(job.zip_code)
            return (
              <div
                key={job.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-foreground">{job.homeowner_name}</p>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.address}, {job.zip_code}
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {job.job_type}
                  </span>
                  <StatusBadge status={job.status} />
                  {job.budget && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${job.budget.toLocaleString()}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">{timeAgo(job.created_at)}</span>
                </div>

                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{job.description}</p>

                {job.photo_urls && job.photo_urls.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {job.photo_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Photo ${i + 1}`} className="h-14 w-14 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Assignment section */}
                {job.contractor_name ? (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
                    <Check className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700">
                      Assigned to <strong>{job.contractor_name}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedContractor[job.id] || ""}
                      onChange={(e) => setSelectedContractor({ ...selectedContractor, [job.id]: e.target.value })}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select contractor...</option>
                      {matching.length > 0 && (
                        <optgroup label={`Zip ${job.zip_code} (matching)`}>
                          {matching.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.username} {c.company_name ? `(${c.company_name})` : ""} — {c.zip_code}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="All contractors">
                        {others.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.username} {c.company_name ? `(${c.company_name})` : ""} — {c.zip_code || "No zip"}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <button
                      onClick={() => handleAssign(job.id)}
                      disabled={assigning === job.id || !selectedContractor[job.id]}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {assigning === job.id ? "Assigning..." : "Assign"}
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
