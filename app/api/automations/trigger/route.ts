import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { sendSMS } from "@/lib/twilio"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

// POST — fire an automation trigger for a job
export async function POST(req: Request) {
  const { trigger, job_id, contractor_id } = await req.json()

  if (!trigger || !job_id || !contractor_id) {
    return NextResponse.json({ error: "Missing trigger, job_id, or contractor_id" }, { status: 400 })
  }

  const supabase = getSupabase()

  // Find active templates matching this trigger for this contractor
  const { data: templates } = await supabase
    .from("followup_templates")
    .select("id, steps")
    .eq("contractor_id", contractor_id)
    .eq("trigger", trigger)
    .eq("active", true)

  if (!templates || templates.length === 0) {
    return NextResponse.json({ scheduled: 0 })
  }

  // Check if this trigger was already fired for this job (prevent duplicates)
  const { count } = await supabase
    .from("scheduled_automations")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job_id)
    .in("template_id", templates.map((t) => t.id))

  if (count && count > 0) {
    return NextResponse.json({ scheduled: 0, message: "Already triggered" })
  }

  const now = new Date()
  let totalScheduled = 0

  for (const template of templates) {
    const steps = template.steps as { day: number; type: string; subject: string; message: string }[]
    if (!Array.isArray(steps)) continue

    const rows = steps.map((step, index) => {
      const scheduledFor = new Date(now)
      scheduledFor.setDate(scheduledFor.getDate() + step.day)

      return {
        template_id: template.id,
        job_id,
        contractor_id,
        step_index: index,
        action_type: step.type,
        subject: step.subject || null,
        message: step.message,
        scheduled_for: scheduledFor.toISOString(),
        status: "pending",
      }
    })

    const { error } = await supabase.from("scheduled_automations").insert(rows)
    if (!error) totalScheduled += rows.length
  }

  // Send SMS notification to contractor if enabled for this trigger type
  const triggerToSmsKey: Record<string, string> = {
    new_lead: "new_lead",
    estimate_viewed: "estimate_viewed",
    job_scheduled: "job_scheduled",
    review_received: "review_received",
    contract_signed: "contract_signed",
    payment_received: "payment_received",
    invoice_overdue: "invoice_overdue",
    appointment_reminder: "appointment_reminder",
  }
  const smsKey = triggerToSmsKey[trigger]
  if (smsKey) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, sms_notifications, notification_preferences")
      .eq("id", contractor_id)
      .single()

    const smsEnabled = profile?.sms_notifications?.[smsKey] || profile?.notification_preferences?.sms?.[smsKey]
    if (profile?.phone && smsEnabled) {
      const triggerLabels: Record<string, string> = {
        new_lead: "New lead assigned",
        estimate_viewed: "Your estimate was viewed",
        job_scheduled: "Job scheduled reminder",
        review_received: "New review received",
        contract_signed: "Contract signed by customer",
        payment_received: "Payment received",
        invoice_overdue: "Invoice is overdue",
        appointment_reminder: "Appointment tomorrow",
      }
      await sendSMS(profile.phone, `[XRoof] ${triggerLabels[smsKey] || trigger} — Check your dashboard for details.`)
    }
  }

  return NextResponse.json({ scheduled: totalScheduled })
}
