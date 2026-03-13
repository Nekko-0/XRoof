import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { sendSMS } from "@/lib/twilio"
import { BookingCreateSchema, validateBody } from "@/lib/validations"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const body = await req.json()
  const bv = validateBody(BookingCreateSchema, body)
  if (bv.error) return NextResponse.json({ error: bv.error }, { status: 400 })
  const { contractor_id, job_id, date, time, customer_name, customer_email, customer_phone, notes } = bv.data!

  // Verify booking is enabled
  const { data: profile } = await supabase
    .from("profiles")
    .select("booking_enabled, booking_duration_min, company_name, phone, email")
    .eq("id", contractor_id)
    .single()

  if (!profile?.booking_enabled) {
    return NextResponse.json({ error: "Online booking is not enabled" }, { status: 400 })
  }

  const duration = profile.booking_duration_min || 60

  // Create the appointment
  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      contractor_id,
      job_id: job_id || null,
      title: `Site Visit — ${customer_name}`,
      date,
      time,
      type: "site_visit",
      notes: notes || null,
      booked_by: "customer",
      customer_name,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      duration_min: duration,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update job scheduled_date if job_id provided
  if (job_id) {
    await supabase
      .from("jobs")
      .update({ scheduled_date: date, status: "Scheduled" })
      .eq("id", job_id)
  }

  const companyName = profile.company_name || "Your Contractor"
  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })
  const formattedTime = formatTime12h(time)

  // Send confirmation email to customer
  if (customer_email) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">
        <div style="text-align:center;border-bottom:2px solid #e5e5e5;padding-bottom:15px;margin-bottom:20px;">
          <h1 style="font-size:22px;margin:0;">Appointment Confirmed</h1>
          <p style="font-size:12px;color:#888;margin:5px 0 0;">${companyName}</p>
        </div>
        <p style="font-size:14px;margin:0 0 15px;">Hi ${customer_name},</p>
        <p style="font-size:13px;color:#555;margin:0 0 20px;">
          Your appointment has been scheduled. Here are the details:
        </p>
        <div style="background:#f9f9f9;border-radius:8px;padding:15px;margin-bottom:20px;">
          <p style="font-size:13px;margin:3px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="font-size:13px;margin:3px 0;"><strong>Time:</strong> ${formattedTime}</p>
          <p style="font-size:13px;margin:3px 0;"><strong>Duration:</strong> ${duration} minutes</p>
          <p style="font-size:13px;margin:3px 0;"><strong>Type:</strong> Site Visit / Inspection</p>
        </div>
        <p style="font-size:13px;color:#555;margin:0 0 10px;">
          If you need to reschedule, please contact us:
        </p>
        <p style="font-size:13px;color:#555;margin:0;">
          ${profile.phone ? `Phone: ${profile.phone}` : ""}
          ${profile.email ? ` | Email: ${profile.email}` : ""}
        </p>
        <div style="border-top:1px solid #eee;padding-top:15px;margin-top:20px;">
          <p style="font-size:10px;color:#ccc;margin:0;">Sent via XRoof</p>
        </div>
      </div>
    `

    resend.emails.send({
      from: `${companyName} via XRoof <contracts@xroof.io>`,
      to: customer_email,
      subject: `Appointment Confirmed — ${formattedDate} at ${formattedTime}`,
      html,
    }).catch((err: unknown) => console.error("[XRoof] fire-and-forget error:", err))
  }

  // Send SMS confirmation
  if (customer_phone) {
    const smsBody = `Hi ${customer_name}! Your appointment with ${companyName} is confirmed for ${formattedDate} at ${formattedTime}. See you then!`
    sendSMS(customer_phone, smsBody).catch((err: unknown) => console.error("[XRoof] fire-and-forget error:", err))
  }

  // Notify contractor via SMS
  if (profile.phone) {
    const smsBody = `New booking: ${customer_name} scheduled a site visit for ${formattedDate} at ${formattedTime}.`
    sendSMS(profile.phone, smsBody).catch((err: unknown) => console.error("[XRoof] fire-and-forget error:", err))
  }

  // Log activity
  if (job_id) {
    await supabase.from("document_events").insert({
      job_id,
      document_type: "appointment",
      document_id: appointment.id,
      event_type: "appointment_booked",
      recipient_email: customer_email || null,
    })
  }

  return NextResponse.json({ success: true, appointment })
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
}
