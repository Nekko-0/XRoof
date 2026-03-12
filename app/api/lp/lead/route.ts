import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { sendSMS } from "@/lib/twilio"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: Request) {
  const { page_id, contractor_id, name, phone, email, address, utm_source, utm_medium, utm_campaign } = await req.json()

  if (!contractor_id || !name || !phone || !address) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Create lead as a new job
  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      contractor_id,
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      address,
      status: "New",
      source: "landing_page",
      source_detail: utm_campaign || utm_source || "landing_page",
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      landing_page_id: page_id || null,
      job_type: "Roofing",
    })
    .select("id")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Increment conversions on landing page
  if (page_id) {
    const { data: pg } = await supabase.from("landing_pages").select("conversions").eq("id", page_id).single()
    if (pg) {
      await supabase.from("landing_pages").update({ conversions: (pg.conversions || 0) + 1 }).eq("id", page_id)
    }
  }

  // Notify contractor via SMS
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, company_name")
    .eq("id", contractor_id)
    .single()

  if (profile?.phone) {
    const source = utm_campaign ? ` (${utm_campaign})` : utm_source ? ` (${utm_source})` : ""
    sendSMS(
      profile.phone,
      `New lead from landing page${source}: ${name}, ${phone}, ${address}`
    ).catch((err: unknown) => console.error("[XRoof] fire-and-forget error:", err))
  }

  // Fire new_lead automation
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  fetch(`${appUrl}/api/automations/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trigger: "new_lead", job_id: job.id, contractor_id, internal_secret: process.env.CRON_SECRET }),
  }).catch((err: unknown) => console.error("[XRoof] fire-and-forget error:", err))

  return NextResponse.json({ success: true })
}
