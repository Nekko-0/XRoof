import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

// Runs every hour — sends email reminders for due follow-ups
export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()

  // Find due follow-ups that haven't been notified yet
  const { data: followups } = await supabase
    .from("followups")
    .select("*, jobs(contractor_id, customer_name, address)")
    .eq("completed", false)
    .is("notified_at", null)
    .lte("due_date", new Date().toISOString())

  if (!followups || followups.length === 0) {
    return NextResponse.json({ message: "No due followups", count: 0 })
  }

  let sent = 0
  for (const f of followups) {
    const job = f.jobs as any
    if (!job?.contractor_id) continue

    // Get contractor email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, company_name")
      .eq("id", job.contractor_id)
      .single()

    if (!profile?.email) continue

    await resend.emails.send({
      from: "XRoof Reminders <reminders@xroof.io>",
      to: profile.email,
      subject: `Follow-up due: ${job.customer_name || job.address}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
          <h2 style="font-size:18px;margin:0 0 10px;">Follow-up Reminder</h2>
          <p style="font-size:14px;color:#555;">You have a follow-up due for:</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:15px;margin:15px 0;">
            <p style="margin:0;font-size:14px;"><strong>${job.customer_name || "Customer"}</strong></p>
            <p style="margin:4px 0 0;font-size:13px;color:#666;">${job.address || ""}</p>
            ${f.note ? `<p style="margin:8px 0 0;font-size:13px;color:#333;">Note: ${f.note}</p>` : ""}
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/contractor/pipeline" style="display:inline-block;background:#0891b2;color:white;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:bold;">View Pipeline</a>
          <p style="font-size:10px;color:#aaa;margin-top:20px;">Sent by XRoof</p>
        </div>
      `,
    })

    // Mark as notified
    await supabase.from("followups").update({ notified_at: new Date().toISOString() }).eq("id", f.id)
    sent++
  }

  return NextResponse.json({ message: `Sent ${sent} followup reminders`, count: sent })
}
