import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const supabase = getServiceSupabase()

  // Fetch ALL jobs for this contractor (not just completed)
  const { data: allJobs } = await supabase
    .from("jobs")
    .select("id, budget, created_at, status, address, customer_name, accepted_at, estimate_sent_at, signed_at, completed_at")
    .eq("contractor_id", userId)
    .order("created_at", { ascending: false })

  const jobs = (allJobs || []).filter((j) => j.status === "Completed")

  // Fetch job costs for profit tracking
  const jobIds = (allJobs || []).map((j) => j.id)
  let costsByJob: Record<string, number> = {}
  if (jobIds.length > 0) {
    const { data: costRows } = await supabase
      .from("job_costs")
      .select("job_id, amount")
      .in("job_id", jobIds)
    if (costRows) {
      for (const c of costRows) {
        costsByJob[c.job_id] = (costsByJob[c.job_id] || 0) + Number(c.amount)
      }
    }
  }

  // Group revenue and costs by month
  const monthlyRevenue: Record<string, number> = {}
  const monthlyCosts: Record<string, number> = {}
  const monthlyCount: Record<string, number> = {}
  let totalRevenue = 0
  let totalCosts = 0

  for (const j of jobs) {
    const date = j.completed_at || j.created_at
    if (!date) continue
    const month = date.slice(0, 7)
    const jobBudget = Number(j.budget) || 0
    const jobCost = costsByJob[j.id] || 0
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + jobBudget
    monthlyCosts[month] = (monthlyCosts[month] || 0) + jobCost
    monthlyCount[month] = (monthlyCount[month] || 0) + 1
    totalRevenue += jobBudget
    totalCosts += jobCost
  }

  const totalProfit = totalRevenue - totalCosts
  const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0

  // Build sorted monthly data (last 12 months)
  const now = new Date()
  const months: { month: string; revenue: number; costs: number; profit: number; jobs: number; cumulative: number }[] = []
  let cumulative = 0
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("en-US", { month: "short" })
    const revenue = monthlyRevenue[key] || 0
    const costs = monthlyCosts[key] || 0
    const jobCount = monthlyCount[key] || 0
    cumulative += revenue
    months.push({ month: label, revenue, costs, profit: revenue - costs, jobs: jobCount, cumulative })
  }

  // Conversion funnel
  const totalLeads = (allJobs || []).length
  const accepted = (allJobs || []).filter((j) => ["Accepted", "Completed"].includes(j.status)).length
  const completed = jobs.length
  const closeRate = totalLeads > 0 ? Math.round((completed / totalLeads) * 100) : 0
  const acceptRate = totalLeads > 0 ? Math.round((accepted / totalLeads) * 100) : 0

  // Lead source breakdown (requires source column — not in current select)
  const sources: { source: string; count: number }[] = []
  const revenueBySource: Record<string, number> = {}

  // Monthly close rate trend
  const monthlyAllJobs: Record<string, number> = {}
  const monthlyCompleted: Record<string, number> = {}
  for (const j of allJobs || []) {
    const date = j.created_at
    if (!date) continue
    const month = date.slice(0, 7)
    monthlyAllJobs[month] = (monthlyAllJobs[month] || 0) + 1
    if (j.status === "Completed") monthlyCompleted[month] = (monthlyCompleted[month] || 0) + 1
  }
  const closeRateTrend = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("en-US", { month: "short" })
    const total = monthlyAllJobs[key] || 0
    const comp = monthlyCompleted[key] || 0
    closeRateTrend.push({ month: label, rate: total > 0 ? Math.round((comp / total) * 100) : 0 })
  }

  // --- Deal Velocity (real stage timestamps) ---
  const daysBetween = (a: string | null, b: string | null) => {
    if (!a || !b) return null
    const ms = new Date(b).getTime() - new Date(a).getTime()
    return ms > 0 ? Math.round(ms / (1000 * 60 * 60 * 24)) : null
  }
  const stageArrays: Record<string, number[]> = { Lead: [], Estimate: [], Signed: [], Completed: [] }
  for (const j of allJobs || []) {
    const leadDays = daysBetween(j.created_at, j.accepted_at)
    const estDays = daysBetween(j.accepted_at, j.estimate_sent_at)
    const signDays = daysBetween(j.estimate_sent_at, j.signed_at)
    const compDays = daysBetween(j.signed_at, j.completed_at)
    if (leadDays !== null) stageArrays.Lead.push(leadDays)
    if (estDays !== null) stageArrays.Estimate.push(estDays)
    if (signDays !== null) stageArrays.Signed.push(signDays)
    if (compDays !== null) stageArrays.Completed.push(compDays)
  }
  const dealVelocity = [
    { stage: "Lead", avgDays: avg(stageArrays.Lead), benchmark: 3 },
    { stage: "Estimate", avgDays: avg(stageArrays.Estimate), benchmark: 5 },
    { stage: "Signed", avgDays: avg(stageArrays.Signed), benchmark: 7 },
    { stage: "Completed", avgDays: avg(stageArrays.Completed), benchmark: 14 },
  ]

  // --- NEW: Zip Revenue ---
  const zipMap: Record<string, { revenue: number; count: number }> = {}
  for (const j of allJobs || []) {
    const zip = extractZip(j.address)
    if (!zip) continue
    if (!zipMap[zip]) zipMap[zip] = { revenue: 0, count: 0 }
    zipMap[zip].count += 1
    if (j.status === "Completed") {
      zipMap[zip].revenue += Number(j.budget) || 0
    }
  }
  const zipRevenue = Object.entries(zipMap)
    .map(([zip, data]) => ({ zip, revenue: data.revenue, count: data.count }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)

  // --- Review requests count ---
  const { count: reviewRequestCount } = await supabase
    .from("document_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "review_requested")
    .in("job_id", jobIds.length > 0 ? jobIds : ["__none__"])

  // --- NEW: Recent Activity (for ticker) ---
  const recentActivity = (allJobs || []).slice(0, 20).map((j) => {
    const typeMap: Record<string, string> = {
      "New": "new",
      "Accepted": "progress",
      "Estimate Sent": "progress",
      "Scheduled": "progress",
      "In Progress": "progress",
      "Completed": "completed",
      "Lost": "lost",
    }
    const t = typeMap[j.status] || "new"
    const text =
      j.status === "Completed" ? `Job completed: ${j.customer_name || "Unknown"}` :
      j.status === "New" ? `New lead: ${j.customer_name || "Unknown"}` :
      j.status === "Accepted" ? `Estimate accepted: ${j.customer_name || "Unknown"}` :
      j.status === "Estimate Sent" ? `Estimate sent: ${j.customer_name || "Unknown"}` :
      `${j.status}: ${j.customer_name || "Unknown"}`
    return {
      text,
      type: t,
      amount: j.budget || 0,
      date: j.created_at || "",
    }
  })

  return NextResponse.json({
    monthly: months,
    totalRevenue,
    totalCosts,
    totalProfit,
    avgMargin,
    totalJobsCompleted: completed,
    totalLeads,
    closeRate,
    acceptRate,
    sources,
    revenueBySource,
    closeRateTrend,
    dealVelocity,
    zipRevenue,
    recentActivity,
    reviewRequestCount: reviewRequestCount || 0,
  })
}

/** Average of number array, returns 0 if empty */
function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
}

/** Extract 5-digit zip code from an address string */
function extractZip(address: string | null | undefined): string | null {
  if (!address) return null
  const match = address.match(/\b(\d{5})\b/)
  return match ? match[1] : null
}
