import { getStripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const stripe = getStripe()
  const { user_id } = await req.json()
  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user_id)
    .single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/contractor/billing`,
  })

  return NextResponse.json({ url: session.url })
}
