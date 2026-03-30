import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/api-auth"
import { Resend } from "resend"
import { randomUUID } from "crypto"

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://xroof.io"

  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  let sent = 0

  try {
    // Find jobs completed 24-48 hours ago
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, contractor_id, customer_name, customer_email")
      .eq("status", "Completed")
      .gte("completed_at", fortyEightHoursAgo)
      .lte("completed_at", twentyFourHoursAgo)

    if (jobsError) {
      console.error("[XRoof] satisfaction survey cron jobs query error:", jobsError)
      return NextResponse.json({ error: jobsError.message }, { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: "No completed jobs to survey", sent: 0 })
    }

    for (const job of jobs) {
      try {
        // Check if survey already exists for this job
        const { data: existing } = await supabase
          .from("satisfaction_surveys")
          .select("id")
          .eq("job_id", job.id)
          .single()

        if (existing) continue

        // Get contractor info
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_name, google_review_url")
          .eq("id", job.contractor_id)
          .single()

        const companyName = profile?.company_name || "Your Contractor"

        // Determine customer email
        let customerEmail = job.customer_email
        if (!customerEmail && job.customer_name) {
          const { data: customer } = await supabase
            .from("customers")
            .select("email")
            .eq("name", job.customer_name)
            .eq("contractor_id", job.contractor_id)
            .single()

          customerEmail = customer?.email
        }

        if (!customerEmail) continue

        // Create survey with token
        const token = randomUUID()
        const { error: insertError } = await supabase
          .from("satisfaction_surveys")
          .insert({
            job_id: job.id,
            contractor_id: job.contractor_id,
            token,
            google_review_url: profile?.google_review_url || null,
          })

        if (insertError) {
          console.error("[XRoof] satisfaction survey insert error:", insertError)
          continue
        }

        // Send email
        const surveyUrl = `${appUrl}/survey/${token}`
        await resend.emails.send({
          from: `${companyName} via XRoof <noreply@xroof.io>`,
          to: customerEmail,
          subject: `How was your experience with ${companyName}?`,
          html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:500px;margin:0 auto;padding:24px;">
  <h2 style="color:#111827;">How was your experience?</h2>
  <p>Hi ${job.customer_name || "there"},</p>
  <p>Thank you for choosing <strong>${companyName}</strong>! We'd love to hear about your experience. Your feedback helps us improve our service.</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="${surveyUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Share Your Feedback</a>
  </p>
  <p style="color:#6b7280;font-size:13px;">This survey takes less than a minute. We appreciate your time!</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="color:#9ca3af;font-size:11px;text-align:center;">${companyName} &bull; Powered by XRoof</p>
</div>`,
        })

        sent++
      } catch (err) {
        console.error("[XRoof] satisfaction survey error for job:", job.id, err)
      }
    }

    return NextResponse.json({ sent })
  } catch (err) {
    console.error("[XRoof] satisfaction survey cron error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
