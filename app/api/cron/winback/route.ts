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

    // Check winback settings
    const { data: settings } = await supabase
      .from("winback_settings")
      .select("*")
      .single()

    if (!settings?.enabled) {
      return NextResponse.json({ message: "Winback disabled", sent: 0 })
    }

    const delayDays = settings.delay_days || 14
    const discountPercent = settings.discount_percent || 20

    // Find canceled subscriptions where cancel date was exactly N days ago
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - delayDays)
    const targetStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    ).toISOString()
    const targetEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59
    ).toISOString()

    const { data: canceledSubs, error: subsError } = await supabase
      .from("subscriptions")
      .select("*, profiles!subscriptions_user_id_fkey(full_name, email)")
      .eq("status", "canceled")
      .gte("updated_at", targetStart)
      .lte("updated_at", targetEnd)

    if (subsError) {
      console.error("Error fetching canceled subscriptions:", subsError)
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      )
    }

    let sentCount = 0

    for (const sub of canceledSubs || []) {
      const profile = sub.profiles
      if (!profile?.email) continue

      // Check if winback campaign already exists for this user
      const { data: existing } = await supabase
        .from("winback_campaigns")
        .select("id")
        .eq("user_id", sub.user_id)
        .limit(1)
        .single()

      if (existing) continue

      // Send winback email
      await resend.emails.send({
        from: "XRoof <noreply@xroof.io>",
        to: profile.email,
        subject: "We miss you! Come back to XRoof",
        html: buildWinbackEmail({
          name: profile.full_name || "there",
          discountPercent,
        }),
      })

      // Insert winback campaign record
      await supabase.from("winback_campaigns").insert({
        user_id: sub.user_id,
        subscription_id: sub.id,
        discount_percent: discountPercent,
        sent_at: new Date().toISOString(),
        status: "sent",
      })

      sentCount++
    }

    return NextResponse.json({ sent: sentCount })
  } catch (err) {
    console.error("Winback cron error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function buildWinbackEmail(data: { name: string; discountPercent: number }) {
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
      <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:40px 32px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:26px;">We'd Love to Have You Back</h1>
        <p style="color:#a0a0b8;margin:12px 0 0;font-size:15px;">Your XRoof account is waiting for you</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#333;font-size:16px;margin:0 0 16px;">Hi ${data.name},</p>
        <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
          We noticed you recently canceled your XRoof subscription. We understand things come up,
          and we wanted to check in.
        </p>
        <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Since you've been gone, we've been hard at work improving the platform with new features
          and enhancements. We'd love for you to give it another try.
        </p>

        <div style="background:#e8f5e9;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
          <p style="color:#2e7d32;font-size:14px;margin:0 0 8px;">Special Offer Just for You</p>
          <p style="color:#1b5e20;font-size:36px;font-weight:800;margin:0;">${data.discountPercent}% OFF</p>
          <p style="color:#2e7d32;font-size:14px;margin:8px 0 0;">your first month back</p>
        </div>

        <div style="text-align:center;margin:24px 0;">
          <a href="https://xroof.io/pricing"
             style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">
            Reactivate My Account
          </a>
        </div>

        <p style="color:#888;font-size:13px;text-align:center;margin:24px 0 0;">
          This offer expires in 7 days. If you have questions or feedback, just reply to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}
