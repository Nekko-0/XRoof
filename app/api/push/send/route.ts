import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = require("web-push")

webpush.setVapidDetails(
  "mailto:contact@leons-roofing.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  const { user_id, title, body } = await req.json()

  if (!user_id || !title) {
    return NextResponse.json({ error: "Missing user_id or title" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // Get push subscriptions for this user
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", user_id)

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const payload = JSON.stringify({ title, body })
  let sent = 0

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub.subscription, payload)
      sent++
    } catch (err: any) {
      // If subscription expired, remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user_id)
          .eq("subscription", sub.subscription)
      }
    }
  }

  return NextResponse.json({ ok: true, sent })
}
