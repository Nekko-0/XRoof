"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import { MapPin, DollarSign, CheckCircle, MessageSquare } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"

type Lead = {
  id: string
  address: string
  zip_code: string
  job_type: string
  description: string
  budget: number | null
  status: string
  created_at: string
  photo_urls?: string[]
  homeowner: { username: string } | null
}

export default function LeadsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: jobsRaw, error } = await supabase
        .from("jobs")
        .select("id, address, zip_code, job_type, description, budget, status, created_at, homeowner_id, photo_urls")
        .is("contractor_id", null)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching leads:", error.message)
      } else {
        // Fetch homeowner profiles separately
        const ownerIds = [...new Set((jobsRaw || []).map((j: any) => j.homeowner_id).filter(Boolean))]
        let profileMap: Record<string, any> = {}
        if (ownerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username")
            .in("id", ownerIds)
          profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))
        }
        setLeads((jobsRaw || []).map((j: any) => ({
          ...j,
          homeowner: j.homeowner_id ? profileMap[j.homeowner_id] || null : null,
        })))
      }
      setLoading(false)
    }

    fetchLeads()
  }, [])

  const handleAccept = async (jobId: string) => {
    setAccepting(jobId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("jobs")
      .update({ contractor_id: user.id, status: "Accepted" })
      .eq("id", jobId)

    if (error) {
      alert("Error accepting lead: " + error.message)
    } else {
      setLeads(leads.filter((l) => l.id !== jobId))
    }
    setAccepting(null)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "1 day ago"
    if (days < 7) return `${days} days ago`
    return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`
  }

  if (loading) return <p className="p-6">Loading leads...</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          All Leads
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse and accept roofing leads from homeowners in your area.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
          No available leads right now. Check back soon!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {lead.address}, {lead.zip_code}
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {lead.job_type}
                </span>
                <StatusBadge status={lead.status.toLowerCase()} />
                {lead.budget && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5" />
                    ${lead.budget.toLocaleString()}
                  </div>
                )}
                <span className="text-xs text-muted-foreground">Posted {timeAgo(lead.created_at)}</span>
              </div>
              <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{lead.description}</p>
              {lead.photo_urls && lead.photo_urls.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {lead.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Job photo ${i + 1}`} className="h-14 w-14 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleAccept(lead.id)}
                  disabled={accepting === lead.id}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {accepting === lead.id ? "Accepting..." : "Accept Lead"}
                </button>
                <Link
                  href="/contractor/messages"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message Homeowner
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
