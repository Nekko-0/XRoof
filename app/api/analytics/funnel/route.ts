import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServiceSupabase()
  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period") || "30" // days

  const since = new Date()
  since.setDate(since.getDate() - parseInt(period))
  const sinceISO = since.toISOString()

  // Get all jobs for this contractor in the period
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, status, budget, created_at, source, job_type")
    .eq("contractor_id", auth.userId)
    .gte("created_at", sinceISO)

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({
      funnel: { leads: 0, estimates_sent: 0, estimates_viewed: 0, accepted: 0, paid: 0 },
      conversion_rates: { lead_to_estimate: 0, estimate_to_view: 0, view_to_accept: 0, accept_to_paid: 0, overall: 0 },
      by_source: {},
      by_job_type: {},
      revenue: { pipeline: 0, closed: 0, lost: 0 },
    })
  }

  const jobIds = jobs.map((j) => j.id)

  // Fetch engagement events
  const { data: events } = await supabase
    .from("document_events")
    .select("job_id, event_type")
    .in("job_id", jobIds)

  // Fetch invoices for payment tracking
  const { data: invoices } = await supabase
    .from("invoices")
    .select("job_id, status, amount")
    .in("job_id", jobIds)

  // Build sets
  const estimateSentJobs = new Set<string>()
  const estimateViewedJobs = new Set<string>()
  const paidJobs = new Set<string>()

  for (const event of events || []) {
    if (event.event_type === "estimate_sent") estimateSentJobs.add(event.job_id)
    if (event.event_type === "estimate_viewed") estimateViewedJobs.add(event.job_id)
  }

  for (const inv of invoices || []) {
    if (inv.status === "paid") paidJobs.add(inv.job_id)
  }

  const acceptedStatuses = ["Accepted", "Scheduled", "In Progress", "Completed"]
  const acceptedJobs = jobs.filter((j) => acceptedStatuses.includes(j.status))
  const completedJobs = jobs.filter((j) => j.status === "Completed")
  const lostJobs = jobs.filter((j) => j.status === "Lost")

  // Funnel counts
  const funnel = {
    leads: jobs.length,
    estimates_sent: estimateSentJobs.size,
    estimates_viewed: estimateViewedJobs.size,
    accepted: acceptedJobs.length,
    paid: paidJobs.size,
  }

  // Conversion rates
  const safeDiv = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0
  const conversion_rates = {
    lead_to_estimate: safeDiv(funnel.estimates_sent, funnel.leads),
    estimate_to_view: safeDiv(funnel.estimates_viewed, funnel.estimates_sent),
    view_to_accept: safeDiv(funnel.accepted, funnel.estimates_viewed || funnel.leads),
    accept_to_paid: safeDiv(funnel.paid, funnel.accepted),
    overall: safeDiv(funnel.paid, funnel.leads),
  }

  // Revenue metrics
  const pipelineValue = jobs
    .filter((j) => !["Completed", "Lost"].includes(j.status))
    .reduce((sum, j) => sum + ((j.budget as number) || 0), 0)
  const closedValue = completedJobs.reduce((sum, j) => sum + ((j.budget as number) || 0), 0)
  const lostValue = lostJobs.reduce((sum, j) => sum + ((j.budget as number) || 0), 0)

  // By source breakdown
  const by_source: Record<string, { leads: number; accepted: number; rate: number }> = {}
  for (const job of jobs) {
    const src = (job.source as string) || "direct"
    if (!by_source[src]) by_source[src] = { leads: 0, accepted: 0, rate: 0 }
    by_source[src].leads++
    if (acceptedStatuses.includes(job.status)) by_source[src].accepted++
  }
  for (const src of Object.keys(by_source)) {
    by_source[src].rate = safeDiv(by_source[src].accepted, by_source[src].leads)
  }

  // By job type breakdown
  const by_job_type: Record<string, { leads: number; accepted: number; rate: number; avg_value: number }> = {}
  for (const job of jobs) {
    const jt = (job.job_type as string) || "Unknown"
    if (!by_job_type[jt]) by_job_type[jt] = { leads: 0, accepted: 0, rate: 0, avg_value: 0 }
    by_job_type[jt].leads++
    if (acceptedStatuses.includes(job.status)) by_job_type[jt].accepted++
  }
  for (const jt of Object.keys(by_job_type)) {
    by_job_type[jt].rate = safeDiv(by_job_type[jt].accepted, by_job_type[jt].leads)
    const jtJobs = jobs.filter((j) => (j.job_type || "Unknown") === jt && (j.budget as number) > 0)
    by_job_type[jt].avg_value = jtJobs.length > 0
      ? Math.round(jtJobs.reduce((sum, j) => sum + ((j.budget as number) || 0), 0) / jtJobs.length)
      : 0
  }

  return NextResponse.json({
    funnel,
    conversion_rates,
    by_source,
    by_job_type,
    revenue: { pipeline: pipelineValue, closed: closedValue, lost: lostValue },
  })
}
