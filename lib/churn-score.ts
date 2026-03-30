import { SupabaseClient } from "@supabase/supabase-js"

export interface ChurnFactor {
  name: string
  points: number
  detail: string
}

export interface ChurnResult {
  user_id: string
  score: number
  risk_level: "low" | "medium" | "high"
  factors: ChurnFactor[]
}

export async function calculateChurnScore(
  supabase: SupabaseClient,
  userId: string
): Promise<ChurnResult> {
  const factors: ChurnFactor[] = []
  let score = 0
  const now = new Date()

  // 1. Days since last login (check auth.users last_sign_in_at)
  const { data: profile } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", userId)
    .single()

  // Use auth admin to get last sign in
  const { data: authUser } = await supabase.auth.admin.getUserById(userId)
  if (authUser?.user?.last_sign_in_at) {
    const daysSinceLogin = Math.floor(
      (now.getTime() - new Date(authUser.user.last_sign_in_at).getTime()) /
        (1000 * 60 * 60 * 24)
    )
    if (daysSinceLogin > 30) {
      score += 30
      factors.push({ name: "login", points: 30, detail: `${daysSinceLogin} days since last login` })
    } else if (daysSinceLogin > 14) {
      score += 15
      factors.push({ name: "login", points: 15, detail: `${daysSinceLogin} days since last login` })
    } else if (daysSinceLogin > 7) {
      score += 5
      factors.push({ name: "login", points: 5, detail: `${daysSinceLogin} days since last login` })
    }
  } else {
    score += 20
    factors.push({ name: "login", points: 20, detail: "Never logged in" })
  }

  // 2. Job creation declining (last 30d vs previous 30d)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const [{ count: recentJobs }, { count: prevJobs }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("contractor_id", userId)
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("contractor_id", userId)
      .gte("created_at", sixtyDaysAgo)
      .lt("created_at", thirtyDaysAgo),
  ])

  const rj = recentJobs || 0
  const pj = prevJobs || 0
  if (pj > 0 && rj === 0) {
    score += 25
    factors.push({ name: "jobs", points: 25, detail: `0 jobs last 30d vs ${pj} previous 30d` })
  } else if (pj > 0 && rj < pj * 0.5) {
    score += 15
    factors.push({ name: "jobs", points: 15, detail: `${rj} jobs last 30d vs ${pj} previous 30d` })
  }

  // 3. Invoice activity declining
  const [{ count: recentInvoices }, { count: prevInvoices }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("contractor_id", userId)
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("contractor_id", userId)
      .gte("created_at", sixtyDaysAgo)
      .lt("created_at", thirtyDaysAgo),
  ])

  const ri = recentInvoices || 0
  const pi = prevInvoices || 0
  if (pi > 0 && ri === 0) {
    score += 20
    factors.push({ name: "invoices", points: 20, detail: `0 invoices last 30d vs ${pi} previous 30d` })
  } else if (pi > 0 && ri < pi * 0.5) {
    score += 10
    factors.push({ name: "invoices", points: 10, detail: `${ri} invoices last 30d vs ${pi} previous 30d` })
  }

  // 4. Payment failures (dunning sequences in last 30d)
  const { count: dunningCount } = await supabase
    .from("dunning_sequences")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo)

  if ((dunningCount || 0) > 0) {
    score += 15
    factors.push({ name: "payment", points: 15, detail: `${dunningCount} payment failure(s) in last 30d` })
  }

  // 5. Open support tickets
  const { count: ticketCount } = await supabase
    .from("support_tickets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "open")

  const tc = Math.min(ticketCount || 0, 2)
  if (tc > 0) {
    const pts = tc * 5
    score += pts
    factors.push({ name: "tickets", points: pts, detail: `${ticketCount} open support ticket(s)` })
  }

  // Clamp 0-100
  score = Math.min(100, Math.max(0, score))
  const risk_level = score > 60 ? "high" : score > 30 ? "medium" : "low"

  return { user_id: userId, score, risk_level, factors }
}
