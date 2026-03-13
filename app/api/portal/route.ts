import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { rateLimit, getClientIP } from "@/lib/rate-limit"
import { emitToUser } from "@/lib/event-emitter"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 })

  // Rate limit public portal access
  const ip = getClientIP(req)
  const rl = rateLimit(`portal:${ip}`, 30, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 })
  }

  // Token is the job ID for simplicity
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id, customer_name, customer_phone, address, zip_code, job_type, status, budget, created_at, contractor_id, scheduled_date")
    .eq("id", token)
    .single()

  if (jobErr || !job) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  // Get contractor info
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, company_name, phone, email, google_review_url, widget_color, logo_url")
    .eq("id", job.contractor_id)
    .single()

  // Get reports for this job
  const { data: reports } = await supabase
    .from("reports")
    .select("id, price_quote, scope_of_work, photo_urls, photo_captions, photo_visible, pricing_tiers, deposit_percent, created_at, report_completed")
    .eq("job_id", job.id)
    .order("created_at", { ascending: false })
    .limit(1)

  // Get photos
  const { data: photos } = await supabase
    .from("job_photos")
    .select("id, url, category, caption, created_at")
    .eq("job_id", job.id)
    .order("created_at", { ascending: false })

  // Get contracts for this job
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, contract_price, deposit_percent, status, signing_token, signing_token_expires_at, customer_signed_at, contractor_signed_at, created_at")
    .eq("job_id", job.id)
    .order("created_at", { ascending: false })

  // Get all reports/estimates (not just latest)
  const { data: allReports } = await supabase
    .from("reports")
    .select("id, price_quote, scope_of_work, viewing_token, viewing_token_expires_at, estimate_accepted, estimate_accepted_at, created_at, report_completed")
    .eq("job_id", job.id)
    .order("created_at", { ascending: false })

  // Get document events for activity timeline
  const { data: events } = await supabase
    .from("document_events")
    .select("id, document_type, event_type, created_at")
    .eq("job_id", job.id)
    .order("created_at", { ascending: false })
    .limit(20)

  // Emit estimate_viewed SSE event to contractor
  if (job.contractor_id) {
    emitToUser(job.contractor_id, {
      type: "estimate_viewed",
      payload: { customerName: job.customer_name, address: job.address },
    })
  }

  return NextResponse.json({
    job,
    contractor: profile || {},
    report: reports?.[0] || null,
    photos: photos || [],
    contracts: contracts || [],
    estimates: allReports || [],
    events: events || [],
  })
}
