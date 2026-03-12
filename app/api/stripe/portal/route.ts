import { getStripe } from "@/lib/stripe"
import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const stripe = getStripe()
  const supabase = getServiceSupabase()

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
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
