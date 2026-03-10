import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const userId = url.searchParams.get("user_id")
  if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // Fetch all completed jobs for this contractor
  const { data: jobs } = await supabase
    .from("jobs")
    .select("budget, updated_at, created_at, status")
    .eq("contractor_id", userId)
    .eq("status", "Completed")

  // Group revenue by month
  const monthlyRevenue: Record<string, number> = {}
  const monthlyCount: Record<string, number> = {}
  let totalRevenue = 0

  for (const j of jobs || []) {
    const date = j.updated_at || j.created_at
    if (!date) continue
    const month = date.slice(0, 7) // "2026-03"
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (j.budget || 0)
    monthlyCount[month] = (monthlyCount[month] || 0) + 1
    totalRevenue += j.budget || 0
  }

  // Build sorted monthly data (last 12 months)
  const now = new Date()
  const months: { month: string; revenue: number; jobs: number; cumulative: number }[] = []
  let cumulative = 0
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("en-US", { month: "short" })
    const revenue = monthlyRevenue[key] || 0
    const jobs = monthlyCount[key] || 0
    cumulative += revenue
    months.push({ month: label, revenue, jobs, cumulative })
  }

  return NextResponse.json({
    monthly: months,
    totalRevenue,
    totalJobsCompleted: (jobs || []).length,
  })
}
