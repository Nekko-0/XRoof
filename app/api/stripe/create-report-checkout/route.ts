import { getStripe } from "@/lib/stripe"
import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const stripe = getStripe()
  const { report_id } = await req.json()
  if (!report_id) {
    return NextResponse.json({ error: "Missing report_id" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

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
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{ price: process.env.STRIPE_REPORT_PRICE_ID!, quantity: 1 }],
    success_url: `${appUrl}/contractor/billing?report_success=true`,
    cancel_url: `${appUrl}/contractor/billing?canceled=true`,
    metadata: { supabase_user_id: userId, report_id, type: "report_purchase" },
  })

  return NextResponse.json({ url: session.url })
}
