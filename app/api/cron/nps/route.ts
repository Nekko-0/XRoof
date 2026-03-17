import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(req: Request) {
  try {
    if (
      req.headers.get("authorization") !==
      `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabase()

    // Check NPS settings
    const { data: settings } = await supabase
      .from("nps_settings")
      .select("*")
      .single()

    if (!settings?.enabled) {
      return NextResponse.json({ message: "NPS surveys disabled", sent: 0 })
    }

    const frequencyDays = settings.frequency_days || 90

    // Calculate the cutoff date - don't send if they received one within frequency_days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - frequencyDays)
    const cutoffISO = cutoffDate.toISOString()

    // Get all active contractors with active subscriptions
    const { data: activeContractors, error: contractorsError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "Contractor")

    if (contractorsError) {
      console.error("Error fetching contractors:", contractorsError)
      return NextResponse.json(
        { error: "Failed to fetch contractors" },
        { status: 500 }
      )
    }

    let sentCount = 0

    for (const contractor of activeContractors || []) {
      if (!contractor.email) continue

      // Check if they have an active subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", contractor.id)
        .eq("status", "active")
        .limit(1)
        .single()

      if (!sub) continue

      // Check if they've received an NPS survey recently
      const { data: recentSurvey } = await supabase
        .from("nps_surveys")
        .select("id")
        .eq("user_id", contractor.id)
        .gte("sent_at", cutoffISO)
        .limit(1)
        .single()

      if (recentSurvey) continue

      // Send NPS survey email
      const surveyLink = `https://xroof.io/nps?token=${contractor.id}`

      await resend.emails.send({
        from: "XRoof <noreply@xroof.io>",
        to: contractor.email,
        subject: "How likely are you to recommend XRoof?",
        html: buildNPSEmail({
          name: contractor.full_name || "there",
          surveyLink,
        }),
      })

      // Record that we sent the survey
      await supabase.from("nps_surveys").insert({
        user_id: contractor.id,
        sent_at: new Date().toISOString(),
        status: "sent",
      })

      sentCount++
    }

    return NextResponse.json({ sent: sentCount })
  } catch (err) {
    console.error("NPS cron error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function buildNPSEmail(data: { name: string; surveyLink: string }) {
  // Generate score buttons 0-10
  const scoreButtons = Array.from({ length: 11 }, (_, i) => {
    const bg =
      i <= 6 ? "#ef5350" : i <= 8 ? "#ffa726" : "#66bb6a"
    return `<a href="${data.surveyLink}&score=${i}"
               style="display:inline-block;width:36px;height:36px;line-height:36px;text-align:center;
                      background:${bg};color:#fff;text-decoration:none;border-radius:6px;
                      font-size:14px;font-weight:600;margin:0 2px;">${i}</a>`
  }).join("")

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="background:#1a1a2e;padding:32px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;">We Value Your Feedback</h1>
      </div>
      <div style="padding:32px;">
        <p style="color:#333;font-size:16px;margin:0 0 16px;">Hi ${data.name},</p>
        <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
          We'd love to hear how you feel about XRoof. Your feedback helps us improve the platform for
          all roofing professionals.
        </p>

        <p style="color:#333;font-size:15px;font-weight:600;text-align:center;margin:0 0 16px;">
          How likely are you to recommend XRoof to a colleague?
        </p>

        <div style="text-align:center;margin:0 0 12px;">
          ${scoreButtons}
        </div>

        <div style="display:flex;justify-content:space-between;margin:0 0 24px;">
          <span style="color:#999;font-size:11px;">Not likely</span>
          <span style="color:#999;font-size:11px;">Very likely</span>
        </div>

        <p style="color:#888;font-size:12px;text-align:center;margin:0;">
          Click a number above to submit your rating. It only takes a second!
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}
