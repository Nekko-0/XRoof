import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

// Lead scoring algorithm: computes a 1-5 score for each job
function computeScore(job: Record<string, unknown>, events: Record<string, unknown>[]): { score: number; factors: string[] } {
  let score = 0
  const factors: string[] = []

  // 1. Has budget/estimate value (+1)
  const budget = job.budget as number | null
  if (budget && budget > 0) {
    score += 1
    if (budget >= 5000) factors.push("High value")
    else factors.push("Has budget")
  }

  // 2. Customer engagement: estimate viewed (+1)
  const viewed = events.some((e) => (e as { event_type: string }).event_type === "estimate_viewed")
  if (viewed) {
    score += 1
    factors.push("Viewed estimate")
  }

  // 3. Customer engagement: portal accessed or message sent (+0.5)
  const portalActivity = events.some((e) =>
    ["portal_viewed", "message_sent"].includes((e as { event_type: string }).event_type)
  )
  if (portalActivity) {
    score += 0.5
    factors.push("Portal active")
  }

  // 4. Has contact info: phone AND email (+0.5)
  const hasPhone = !!(job.customer_phone as string)
  const hasEmail = !!(job.customer_email as string)
  if (hasPhone && hasEmail) {
    score += 0.5
    factors.push("Full contact info")
  } else if (hasPhone || hasEmail) {
    score += 0.25
  }

  // 5. Insurance claim (+0.5 — higher close rate)
  if (job.is_insurance_claim) {
    score += 0.5
    factors.push("Insurance claim")
  }

  // 6. Recency: created within last 7 days (+0.5)
  const createdAt = new Date(job.created_at as string)
  const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceCreation <= 7) {
    score += 0.5
    factors.push("Recent lead")
  } else if (daysSinceCreation > 30) {
    score -= 0.5
    factors.push("Aging lead")
  }

  // 7. Estimate already sent (+0.5)
  const estimateSent = events.some((e) => (e as { event_type: string }).event_type === "estimate_sent")
  if (estimateSent) {
    score += 0.5
    factors.push("Estimate sent")
  }

  // Clamp to 1-5
  const finalScore = Math.max(1, Math.min(5, Math.round(score * 10) / 10))

  return { score: finalScore, factors }
}

// GET — compute lead scores for all active jobs
export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServiceSupabase()

  // Fetch all active jobs for this contractor
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, budget, customer_phone, customer_email, is_insurance_claim, created_at, status")
    .eq("contractor_id", auth.userId)
    .not("status", "eq", "Completed")
    .not("status", "eq", "Hidden")

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ scores: {} })
  }

  const jobIds = jobs.map((j) => j.id)

  // Fetch all engagement events for these jobs
  const { data: events } = await supabase
    .from("document_events")
    .select("job_id, event_type")
    .in("job_id", jobIds)

  // Group events by job
  const eventsByJob: Record<string, Record<string, unknown>[]> = {}
  for (const event of events || []) {
    if (!eventsByJob[event.job_id]) eventsByJob[event.job_id] = []
    eventsByJob[event.job_id].push(event)
  }

  // Compute scores
  const scores: Record<string, { score: number; factors: string[] }> = {}
  for (const job of jobs) {
    scores[job.id] = computeScore(job, eventsByJob[job.id] || [])
  }

  return NextResponse.json({ scores })
}
