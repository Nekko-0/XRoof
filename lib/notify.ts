/**
 * Unified notification system — sends in-app + push + email
 * for every important event, routed to the right roles.
 */
import { Resend } from "resend"
import { getServiceSupabase } from "@/lib/api-auth"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = require("web-push")

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || "support@xroof.io"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

type NotifyOptions = {
  userId: string
  type: string
  title: string
  body: string
  email?: string
}

/**
 * Send in-app notification + push + email to a single user.
 * All channels are fire-and-forget — failures don't block.
 */
export async function sendNotificationBundle(opts: NotifyOptions) {
  const supabase = getServiceSupabase()

  // 1. In-app notification
  await supabase.from("notifications").insert({
    user_id: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    read: false,
  }).then(({ error }) => {
    if (error) console.error("[XRoof] notification insert error:", error.message)
  })

  // 2. Push notification
  try {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", opts.userId)

    if (subs && subs.length > 0) {
      const payload = JSON.stringify({ title: opts.title, body: opts.body })
      for (const sub of subs) {
        try {
          await webpush.sendNotification(sub.subscription, payload)
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", opts.userId)
              .eq("subscription", sub.subscription)
          }
        }
      }
    }
  } catch (err) {
    console.error("[XRoof] push send error:", err)
  }

  // 3. Email notification
  if (opts.email && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: "XRoof Notifications <noreply@xroof.io>",
        to: opts.email,
        subject: opts.title,
        html: buildNotificationEmail(opts.title, opts.body),
      })
    } catch (err) {
      console.error("[XRoof] email send error:", err)
    }
  }
}

/**
 * Resolve which users should be notified based on event audience.
 *
 * "owner_admin" — owner + admin team members (business-sensitive: estimates, contracts, payments)
 * "owner_admin_office" — owner + admin + office_manager (operations: messages, leads)
 * "assigned" — a specific team member (work orders)
 */
export async function getNotificationRecipients(
  accountId: string,
  audience: "owner_admin" | "owner_admin_office" | "assigned",
  assignedTeamMemberId?: string
): Promise<{ userId: string; email: string }[]> {
  const supabase = getServiceSupabase()

  // For assigned crew member, look up their user account
  if (audience === "assigned" && assignedTeamMemberId) {
    const { data: member } = await supabase
      .from("team_members")
      .select("user_id, invited_email")
      .eq("id", assignedTeamMemberId)
      .single()

    if (member?.user_id) {
      return [{ userId: member.user_id, email: member.invited_email }]
    }
    return []
  }

  const recipients: { userId: string; email: string }[] = []

  // Owner (the account holder)
  const { data: owner } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", accountId)
    .single()

  if (owner?.email) {
    recipients.push({ userId: owner.id, email: owner.email })
  }

  // Team members with matching roles who have linked user accounts
  const roles = audience === "owner_admin"
    ? ["admin"]
    : ["admin", "office_manager"]

  const { data: members } = await supabase
    .from("team_members")
    .select("user_id, invited_email, role")
    .eq("account_id", accountId)
    .eq("status", "active")
    .in("role", roles)
    .not("user_id", "is", null)

  if (members) {
    for (const m of members) {
      if (m.user_id && !recipients.some((r) => r.userId === m.user_id)) {
        recipients.push({ userId: m.user_id, email: m.invited_email })
      }
    }
  }

  return recipients
}

/**
 * Convenience: notify all recipients for an event in one call.
 */
export async function notifyRecipients(
  accountId: string,
  audience: "owner_admin" | "owner_admin_office" | "assigned",
  type: string,
  title: string,
  body: string,
  assignedTeamMemberId?: string
) {
  const recipients = await getNotificationRecipients(accountId, audience, assignedTeamMemberId)
  await Promise.all(
    recipients.map((r) =>
      sendNotificationBundle({ userId: r.userId, type, title, body, email: r.email })
    )
  )
}

function buildNotificationEmail(title: string, body: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.xroof.io"
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <div style="background:#111827;border-radius:12px;padding:24px;color:#fff;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
      <div style="width:32px;height:32px;background:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:16px;font-weight:bold;color:#fff;">X</span>
      </div>
      <span style="font-size:14px;font-weight:600;color:#9ca3af;">XRoof</span>
    </div>
    <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;">${title}</h2>
    <p style="margin:0;color:#9ca3af;font-size:14px;line-height:1.6;">${body}</p>
    <a href="${appUrl}/contractor/dashboard" style="display:inline-block;margin-top:20px;padding:10px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Open XRoof</a>
  </div>
  <p style="text-align:center;margin-top:12px;font-size:11px;color:#6b7280;">XRoof Notifications &bull; <a href="${appUrl}" style="color:#6b7280;">xroof.io</a></p>
</div>`
}
