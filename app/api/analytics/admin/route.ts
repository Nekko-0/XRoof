import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // All completed jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("budget, updated_at, created_at, status")
    .eq("status", "Completed")

  // All reports
  const { data: reports } = await supabase
    .from("reports")
    .select("created_at")

  // Active contractors
  const { count: activeContractors } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "Contractor")

  // Group by month
  const monthlyRevenue: Record<string, number> = {}
  const monthlyJobs: Record<string, number> = {}
  const monthlyReports: Record<string, number> = {}
  let totalRevenue = 0

  for (const j of jobs || []) {
    const date = j.updated_at || j.created_at
    if (!date) continue
    const month = date.slice(0, 7)
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (j.budget || 0)
    monthlyJobs[month] = (monthlyJobs[month] || 0) + 1
    totalRevenue += j.budget || 0
  }

  for (const r of reports || []) {
    if (!r.created_at) continue
    const month = r.created_at.slice(0, 7)
    monthlyReports[month] = (monthlyReports[month] || 0) + 1
  }

  const now = new Date()
  const months: { month: string; revenue: number; jobs: number; reports: number; cumulative: number }[] = []
  let cumulative = 0
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("en-US", { month: "short" })
    const revenue = monthlyRevenue[key] || 0
    cumulative += revenue
    months.push({
      month: label,
      revenue,
      jobs: monthlyJobs[key] || 0,
      reports: monthlyReports[key] || 0,
      cumulative,
    })
  }

  return NextResponse.json({
    monthly: months,
    totalRevenue,
    totalJobsCompleted: (jobs || []).length,
    totalReports: (reports || []).length,
    activeContractors: activeContractors || 0,
  })
}
