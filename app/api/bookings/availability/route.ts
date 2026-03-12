import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

type BookingHours = { start: string; end: string; days: number[] }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const contractorId = searchParams.get("contractor_id")
  const dateStr = searchParams.get("date") // YYYY-MM-DD

  if (!contractorId || !dateStr) {
    return NextResponse.json({ error: "Missing contractor_id or date" }, { status: 400 })
  }

  // Fetch contractor booking settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("booking_enabled, booking_hours, booking_duration_min, booking_buffer_min")
    .eq("id", contractorId)
    .single()

  if (!profile?.booking_enabled) {
    return NextResponse.json({ error: "Online booking is not enabled" }, { status: 400 })
  }

  const hours: BookingHours = profile.booking_hours || { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] }
  const duration = profile.booking_duration_min || 60
  const buffer = profile.booking_buffer_min || 30

  // Check if selected date's day-of-week is in available days
  const date = new Date(dateStr + "T12:00:00")
  const dayOfWeek = date.getDay() // 0=Sun, 6=Sat
  if (!hours.days.includes(dayOfWeek)) {
    return NextResponse.json({ slots: [] })
  }

  // Fetch existing appointments for this date
  const { data: existing } = await supabase
    .from("appointments")
    .select("time, duration_min")
    .eq("contractor_id", contractorId)
    .eq("date", dateStr)

  // Fetch scheduled jobs for this date
  const { data: scheduledJobs } = await supabase
    .from("jobs")
    .select("scheduled_date")
    .eq("contractor_id", contractorId)
    .eq("scheduled_date", dateStr)

  // Build occupied time ranges (in minutes from midnight)
  const occupied: { start: number; end: number }[] = []

  for (const appt of existing || []) {
    if (!appt.time) continue
    const startMin = timeToMinutes(appt.time)
    const endMin = startMin + (appt.duration_min || duration)
    occupied.push({ start: startMin - buffer, end: endMin + buffer })
  }

  // Each scheduled job blocks a 2-hour window at 9am by default
  for (const _job of scheduledJobs || []) {
    occupied.push({ start: timeToMinutes("09:00"), end: timeToMinutes("11:00") })
  }

  // Generate available slots
  const startMin = timeToMinutes(hours.start)
  const endMin = timeToMinutes(hours.end)
  const slots: string[] = []

  for (let t = startMin; t + duration <= endMin; t += 30) {
    const slotEnd = t + duration
    const conflict = occupied.some(
      (o) => t < o.end && slotEnd > o.start
    )
    if (!conflict) {
      slots.push(minutesToTime(t))
    }
  }

  // Don't show past slots for today
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const filteredSlots = dateStr === todayStr
    ? slots.filter((s) => timeToMinutes(s) > now.getHours() * 60 + now.getMinutes() + 60)
    : slots

  return NextResponse.json({ slots: filteredSlots, duration })
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}
