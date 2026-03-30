import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { calculateChurnScore } from "@/lib/churn-score"

const resend = new Resend(process.env.RESEND_API_KEY)

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Get all contractors with active subscriptions
    const { data: activeSubs, error: subsError } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("status", "active")

    if (subsError) {
      console.error("Error fetching active subscriptions:", subsError)
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      )
    }

    const userIds = [
      ...new Set((activeSubs || []).map((s) => s.user_id)),
    ]

    // Get previous scores for comparison
    const { data: previousScores } = await supabase
      .from("churn_scores")
      .select("user_id, score, risk_level")

    const prevScoreMap = new Map(
      (previousScores || []).map((s) => [s.user_id, s])
    )

    let calculated = 0
    const newHighRisk: Array<{
      user_id: string
      score: number
      company_name?: string
      email?: string
    }> = []

    for (const userId of userIds) {
      const result = await calculateChurnScore(supabase, userId)

      // Check if this is a NEW high-risk user
      const prev = prevScoreMap.get(userId)
      const wasHighRisk = prev && prev.score > 60
      const isHighRisk = result.score > 60

      if (isHighRisk && !wasHighRisk) {
        // Fetch profile info for the alert email
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_name, email")
          .eq("id", userId)
          .single()

        newHighRisk.push({
          user_id: userId,
          score: result.score,
          company_name: profile?.company_name,
          email: profile?.email,
        })
      }

      // Delete old score and insert new one
      await supabase.from("churn_scores").delete().eq("user_id", userId)

      const { error: insertError } = await supabase
        .from("churn_scores")
        .insert({
          user_id: result.user_id,
          score: result.score,
          risk_level: result.risk_level,
          factors: result.factors,
          calculated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error(
          `Error inserting churn score for ${userId}:`,
          insertError
        )
        continue
      }

      calculated++
    }

    // Send alert email if there are new high-risk users
    if (newHighRisk.length > 0) {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      if (adminEmail) {
        const rows = newHighRisk
          .map(
            (u) =>
              `<tr>
                <td style="padding:8px;border-bottom:1px solid #eee;">${u.company_name || "N/A"}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;">${u.email || "N/A"}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#d32f2f;">${u.score}</td>
              </tr>`
          )
          .join("")

        await resend.emails.send({
          from: "XRoof <noreply@xroof.io>",
          to: adminEmail,
          subject: `Churn Alert: ${newHighRisk.length} new high-risk contractor(s)`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="background:#d32f2f;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Churn Risk Alert</h1>
      </div>
      <div style="padding:32px;">
        <p style="color:#333;font-size:16px;margin:0 0 16px;">
          ${newHighRisk.length} contractor(s) have entered high churn risk (score &gt; 60):
        </p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;text-align:left;">Company</th>
              <th style="padding:8px;text-align:left;">Email</th>
              <th style="padding:8px;text-align:left;">Score</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://xroof.io/owner/churn"
             style="display:inline-block;background:#1976d2;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;">
            View Churn Dashboard
          </a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
        })
      }
    }

    return NextResponse.json({
      calculated,
      new_high_risk: newHighRisk.length,
    })
  } catch (err) {
    console.error("Churn alert cron error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
