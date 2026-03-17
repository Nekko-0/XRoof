import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const user = await requireAuth(req)
  if (user instanceof NextResponse) return user

  try {
    const supabase = getServiceSupabase()

    // Get all jobs for this contractor with source info
    const { data: jobs, error: jobsErr } = await supabase
      .from("jobs")
      .select("id, source_detail, status, created_at")
      .eq("contractor_id", user.userId)

    if (jobsErr) return NextResponse.json({ error: jobsErr.message }, { status: 500 })

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ sources: [] })
    }

    // Get paid invoices for these jobs
    const jobIds = jobs.map((j) => j.id)
    const { data: invoices } = await supabase
      .from("invoices")
      .select("job_id, amount, status")
      .in("job_id", jobIds)
      .eq("status", "paid")

    // Build source → metrics map
    const sourceMap = new Map<string, { jobs: number; won: number; revenue: number }>()

    for (const job of jobs) {
      const source = job.source_detail || "Unknown"
      const entry = sourceMap.get(source) || { jobs: 0, won: 0, revenue: 0 }
      entry.jobs++
      if (job.status === "Completed") entry.won++
      sourceMap.set(source, entry)
    }

    // Add revenue from invoices
    for (const inv of invoices || []) {
      const job = jobs.find((j) => j.id === inv.job_id)
      const source = job?.source_detail || "Unknown"
      const entry = sourceMap.get(source)
      if (entry) entry.revenue += inv.amount || 0
    }

    const sources = Array.from(sourceMap.entries())
      .map(([name, stats]) => ({
        name,
        jobs: stats.jobs,
        won: stats.won,
        revenue: stats.revenue,
        avg_deal: stats.won > 0 ? Math.round(stats.revenue / stats.won) : 0,
        conversion: stats.jobs > 0 ? Math.round((stats.won / stats.jobs) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    return NextResponse.json({ sources })
  } catch (err) {
    console.error("[XRoof] lead-roi error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
