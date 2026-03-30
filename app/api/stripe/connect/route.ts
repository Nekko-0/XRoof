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
    .select("stripe_connect_account_id")
    .eq("id", userId)
    .single()

  let accountId = profile?.stripe_connect_account_id

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "standard",
      metadata: { supabase_user_id: userId },
    })
    accountId = account.id

    await supabase
      .from("profiles")
      .update({ stripe_connect_account_id: accountId })
      .eq("id", userId)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/contractor/billing?connect=refresh`,
    return_url: `${appUrl}/contractor/billing?connect=success`,
    type: "account_onboarding",
  })

  return NextResponse.json({ url: accountLink.url })
}

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const stripe = getStripe()
  const supabase = getServiceSupabase()

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", userId)
    .single()

  if (!profile?.stripe_connect_account_id) {
    return NextResponse.json({ connected: false })
  }

  try {
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id)
    return NextResponse.json({
      connected: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      account_id: account.id,
    })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
