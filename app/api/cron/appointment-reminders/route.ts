import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

// Runs daily at 8 AM — fires appointment_reminder trigger for tomorrow's appointments
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split("T")[0] // YYYY-MM-DD

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, job_id, contractor_id")
    .eq("date", tomorrowStr)
    .limit(200)

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ message: "No appointments tomorrow", triggered: 0 })
  }

  let triggered = 0

  for (const appt of appointments) {
    if (!appt.job_id || !appt.contractor_id) continue

    try {
      await fetch(`${appUrl}/api/automations/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: "appointment_reminder",
          job_id: appt.job_id,
          contractor_id: appt.contractor_id,
        }),
      })
      triggered++
    } catch {}
  }

  return NextResponse.json({ message: `Checked ${appointments.length} appointments for ${tomorrowStr}`, triggered })
}
