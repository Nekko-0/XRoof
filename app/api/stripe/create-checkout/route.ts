import { getStripe } from "@/lib/stripe"
import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const stripe = getStripe()
  const { plan, address, notes, roof_type } = await req.json()
  if (!plan) {
    return NextResponse.json({ error: "Missing plan" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email, username")
    .eq("id", userId)
    .single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email || undefined,
      name: profile?.username || undefined,
      metadata: { supabase_user_id: userId },
    })
    customerId = customer.id

    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  // One-time report payments
  const reportPrices: Record<string, number> = {
    report_full: 3000,
  }

  if (reportPrices[plan]) {
    const tierLabel = plan.replace("report_", "")

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `Roof Report — ${tierLabel.charAt(0).toUpperCase() + tierLabel.slice(1)}` },
          unit_amount: reportPrices[plan],
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/contractor/report?success=true&tier=${tierLabel}&address=${encodeURIComponent(address || "")}&notes=${encodeURIComponent(notes || "")}&roof_type=${encodeURIComponent(roof_type || "Residential")}`,
      cancel_url: `${appUrl}/contractor/report?canceled=true`,
      metadata: { supabase_user_id: userId, plan, report_type: tierLabel, address: address || "" },
    })

    return NextResponse.json({ url: session.url })
  }

  // Subscription plans
  const priceId = plan === "annual"
    ? process.env.STRIPE_ANNUAL_PRICE_ID!
    : plan === "widget"
    ? process.env.STRIPE_WIDGET_PRICE_ID!
    : process.env.STRIPE_MONTHLY_PRICE_ID!

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 7 },
    success_url: `${appUrl}/contractor/billing?success=true`,
    cancel_url: `${appUrl}/contractor/billing?canceled=true`,
    metadata: { supabase_user_id: userId, plan },
  })

  return NextResponse.json({ url: session.url })
}
