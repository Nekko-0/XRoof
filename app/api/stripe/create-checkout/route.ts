import { getStripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const stripe = getStripe()
  const { user_id, plan } = await req.json()
  if (!user_id || !plan) {
    return NextResponse.json({ error: "Missing user_id or plan" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email, username")
    .eq("id", user_id)
    .single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email || undefined,
      name: profile?.username || undefined,
      metadata: { supabase_user_id: user_id },
    })
    customerId = customer.id

    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user_id)
  }

  const priceId = plan === "annual"
    ? process.env.STRIPE_ANNUAL_PRICE_ID!
    : process.env.STRIPE_MONTHLY_PRICE_ID!

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/contractor/billing?success=true`,
    cancel_url: `${appUrl}/contractor/billing?canceled=true`,
    metadata: { supabase_user_id: user_id, plan },
  })

  return NextResponse.json({ url: session.url })
}
