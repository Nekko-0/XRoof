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

    // Check if dunning is enabled
    const { data: settings } = await supabase
      .from("dunning_settings")
      .select("*")
      .single()

    if (!settings?.enabled) {
      return NextResponse.json({ message: "Dunning disabled", processed: 0 })
    }

    // Find all past_due subscriptions
    const { data: pastDueSubs, error: subsError } = await supabase
      .from("subscriptions")
      .select("*, profiles!subscriptions_user_id_fkey(full_name, email)")
      .eq("status", "past_due")

    if (subsError) {
      console.error("Error fetching past_due subscriptions:", subsError)
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
    }

    const now = new Date()
    let processed = 0

    for (const sub of pastDueSubs || []) {
      const profile = sub.profiles
      if (!profile?.email) continue

      const email = profile.email
      const name = profile.full_name || "there"

      // Check existing dunning sequence for this subscription
      const { data: sequence } = await supabase
        .from("dunning_sequences")
        .select("*")
        .eq("subscription_id", sub.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      const daysSincePastDue = Math.floor(
        (now.getTime() - new Date(sub.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      if (!sequence) {
        // No sequence exists yet - check if past_due for >= 1 day
        if (daysSincePastDue >= 1) {
          // Send step 1 email
          await resend.emails.send({
            from: "XRoof <noreply@xroof.io>",
            to: email,
            subject: "Action Required: Payment Failed",
            html: buildDunningEmail({
              name,
              step: 1,
              message:
                "We noticed your recent payment didn't go through. This can happen for a number of reasons. Please update your payment method to keep your account active.",
            }),
          })

          await supabase.from("dunning_sequences").insert({
            subscription_id: sub.id,
            user_id: sub.user_id,
            step: 1,
            sent_at: now.toISOString(),
          })

          processed++
        }
      } else if (sequence.step === 1) {
        // Step 1 sent >= 2 days ago -> send step 2 (day 3 email)
        const daysSinceStep1 = Math.floor(
          (now.getTime() - new Date(sequence.sent_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysSinceStep1 >= 2) {
          await resend.emails.send({
            from: "XRoof <noreply@xroof.io>",
            to: email,
            subject: "Your XRoof Account Needs Attention",
            html: buildDunningEmail({
              name,
              step: 2,
              message:
                "Your payment is still outstanding. To avoid any disruption to your service, please update your payment method as soon as possible. Your data and settings are safe, but some features may be limited until payment is resolved.",
            }),
          })

          await supabase
            .from("dunning_sequences")
            .update({ step: 2, sent_at: now.toISOString() })
            .eq("id", sequence.id)

          processed++
        }
      } else if (sequence.step === 2) {
        // Step 2 sent >= 4 days ago -> send step 3 (day 7 email)
        const daysSinceStep2 = Math.floor(
          (now.getTime() - new Date(sequence.sent_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysSinceStep2 >= 4) {
          await resend.emails.send({
            from: "XRoof <noreply@xroof.io>",
            to: email,
            subject: "Final Notice: Account Will Be Suspended",
            html: buildDunningEmail({
              name,
              step: 3,
              message:
                "This is your final notice regarding the outstanding payment on your XRoof account. If we don't receive payment within the next 48 hours, your account will be suspended and you'll lose access to all features. Please update your payment information immediately to avoid interruption.",
            }),
          })

          await supabase
            .from("dunning_sequences")
            .update({ step: 3, sent_at: now.toISOString() })
            .eq("id", sequence.id)

          processed++
        }
      }
    }

    return NextResponse.json({ processed })
  } catch (err) {
    console.error("Dunning cron error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function buildDunningEmail(data: {
  name: string
  step: number
  message: string
}) {
  const urgencyColor =
    data.step === 1 ? "#f59e0b" : data.step === 2 ? "#ef6c00" : "#d32f2f"
  const urgencyLabel =
    data.step === 1
      ? "Payment Reminder"
      : data.step === 2
        ? "Urgent Reminder"
        : "Final Notice"

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
      <div style="background:${urgencyColor};padding:24px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:20px;">${urgencyLabel}</h1>
      </div>
      <div style="padding:32px;">
        <p style="color:#333;font-size:16px;margin:0 0 16px;">Hi ${data.name},</p>
        <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">${data.message}</p>

        <div style="text-align:center;margin:24px 0;">
          <a href="https://xroof.io/dashboard/settings/billing"
             style="display:inline-block;background:${urgencyColor};color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;">
            Update Payment Method
          </a>
        </div>

        <p style="color:#888;font-size:13px;margin:24px 0 0;">
          If you've already updated your payment information, please disregard this email.
          Need help? Reply to this email and we'll assist you.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}
