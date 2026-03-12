import { NextResponse } from "next/server"
import { refreshAccessToken, createCalendarEvent } from "@/lib/google-calendar"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

// POST — sync scheduled jobs + appointments to Google Calendar
export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId: contractor_id } = auth

  const supabase = getServiceSupabase()

  // Get contractor's refresh token
  const { data: profile } = await supabase
    .from("profiles")
    .select("google_refresh_token, google_calendar_connected")
    .eq("id", contractor_id)
    .single()

  if (!profile?.google_refresh_token || !profile?.google_calendar_connected) {
    return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 })
  }

  // Refresh access token
  const tokenData = await refreshAccessToken(profile.google_refresh_token)
  if (!tokenData.access_token) {
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 401 })
  }

  const accessToken = tokenData.access_token
  let synced = 0

  // Sync scheduled jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, customer_name, address, scheduled_date, scheduled_end_date, job_type, status")
    .eq("contractor_id", contractor_id)
    .not("scheduled_date", "is", null)
    .in("status", ["Scheduled", "Accepted", "In Progress"])

  for (const job of jobs || []) {
    try {
      await createCalendarEvent(accessToken, {
        summary: `${job.job_type || "Roofing"}: ${job.customer_name}`,
        description: `XRoof Job — ${job.status}\nAddress: ${job.address}`,
        location: job.address,
        start: job.scheduled_date,
        end: job.scheduled_end_date || job.scheduled_date,
        allDay: true,
      })
      synced++
    } catch (err) {
      console.error("Failed to sync job:", job.id, err)
    }
  }

  // Sync appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, title, date, time, type, notes")
    .eq("contractor_id", contractor_id)
    .gte("date", new Date().toISOString().slice(0, 10))

  for (const appt of appointments || []) {
    try {
      const startTime = appt.time
        ? `${appt.date}T${appt.time}:00`
        : appt.date

      await createCalendarEvent(accessToken, {
        summary: appt.title,
        description: `XRoof ${appt.type.replace("_", " ")}\n${appt.notes || ""}`,
        start: startTime,
        allDay: !appt.time,
      })
      synced++
    } catch (err) {
      console.error("Failed to sync appointment:", appt.id, err)
    }
  }

  return NextResponse.json({ message: `Synced ${synced} events to Google Calendar`, synced })
}
