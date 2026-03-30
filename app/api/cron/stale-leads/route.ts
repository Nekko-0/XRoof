import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

// Runs daily — marks stale leads as "Lost" after configurable inactivity period
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()

  // Get all contractors with their stale_lead_days setting
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, stale_lead_days")

  if (!profiles) return NextResponse.json({ message: "No profiles", count: 0 })

  let total = 0
  for (const profile of profiles) {
    const staleDays = profile.stale_lead_days || 30
    const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString()

    // Find stale jobs for this contractor
    const { data: staleJobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("contractor_id", profile.id)
      .in("status", ["New", "Accepted"])
      .lte("created_at", cutoff)

    if (!staleJobs || staleJobs.length === 0) continue

    const ids = staleJobs.map((j) => j.id)
    await supabase.from("jobs").update({ status: "Lost" }).in("id", ids)
    total += ids.length
  }

  return NextResponse.json({ message: `Marked ${total} stale leads as Lost`, count: total })
}
