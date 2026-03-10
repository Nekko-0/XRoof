import { getStripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const stripe = getStripe()
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any
      const userId = session.metadata?.supabase_user_id

      if (session.mode === "subscription" && userId) {
        const subscriptionId = session.subscription as string
        const sub = await stripe.subscriptions.retrieve(subscriptionId) as any

        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscriptionId,
          plan: session.metadata?.plan || "monthly",
          status: sub.status,
          current_period_start: new Date((sub.current_period_start || 0) * 1000).toISOString(),
          current_period_end: new Date((sub.current_period_end || 0) * 1000).toISOString(),
        }, { onConflict: "user_id" })
      }

      if (session.metadata?.type === "report_purchase" && userId) {
        await supabase.from("report_purchases").insert({
          user_id: userId,
          report_id: session.metadata.report_id,
          stripe_payment_intent_id: session.payment_intent,
          amount: session.amount_total,
          status: "paid",
        })
      }
      break
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as any
      await supabase
        .from("subscriptions")
        .update({
          status: sub.status,
          current_period_start: new Date((sub.current_period_start || 0) * 1000).toISOString(),
          current_period_end: new Date((sub.current_period_end || 0) * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", sub.id)
      break
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as any
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", sub.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
