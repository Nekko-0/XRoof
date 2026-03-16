import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"
import { getStripe } from "@/lib/stripe"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("account_id", userId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()
  const stripe = getStripe()

  const body = await req.json()
  const { invited_email, role, invited_name } = body

  if (!invited_email || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Require active subscription to add team members
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .in("plan", ["monthly", "annual"])
    .maybeSingle()

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json(
      { error: "Active subscription required to add team members. Go to Billing to subscribe." },
      { status: 403 }
    )
  }

  // Check if already invited
  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("account_id", userId)
    .eq("invited_email", invited_email.toLowerCase())
    .single()

  if (existing) {
    return NextResponse.json({ error: "This email has already been invited" }, { status: 409 })
  }

  // Add team seat to Stripe subscription
  const seatPriceId = process.env.STRIPE_TEAM_SEAT_PRICE_ID
  if (!seatPriceId) {
    return NextResponse.json({ error: "Team seat pricing not configured" }, { status: 500 })
  }

  try {
    // Check if seat line item already exists on the subscription
    const subData = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
      expand: ["items.data"],
    })
    const seatItem = subData.items.data.find(
      (item) => item.price.id === seatPriceId
    )

    if (seatItem) {
      // Increment existing seat quantity
      await stripe.subscriptionItems.update(seatItem.id, {
        quantity: (seatItem.quantity || 1) + 1,
        proration_behavior: "create_prorations",
      })
    } else {
      // Add new seat line item
      await stripe.subscriptionItems.create({
        subscription: sub.stripe_subscription_id,
        price: seatPriceId,
        quantity: 1,
        proration_behavior: "create_prorations",
      })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    console.error("Stripe seat billing error:", msg)
    return NextResponse.json({ error: "Failed to add team seat to billing. Please try again." }, { status: 500 })
  }

  // Insert team member
  const { data, error } = await supabase
    .from("team_members")
    .insert({
      account_id: userId,
      invited_email: invited_email.toLowerCase(),
      invited_name: invited_name || "",
      role,
      status: "invited",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-send invite email
  if (data?.id) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      await fetch(`${appUrl}/api/team/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_member_id: data.id }),
      })
    } catch (e) {
      console.error("Failed to send invite email:", e)
    }
  }

  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  // Verify the team member belongs to the authenticated user's account
  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("id", id)
    .eq("account_id", userId)
    .single()

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("team_members")
    .update(updates)
    .eq("id", id)
    .eq("account_id", userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()
  const stripe = getStripe()

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  // Verify the team member belongs to the authenticated user's account
  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("id", id)
    .eq("account_id", userId)
    .single()

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 })
  }

  // Decrement Stripe seat billing
  const seatPriceId = process.env.STRIPE_TEAM_SEAT_PRICE_ID
  if (seatPriceId) {
    try {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", userId)
        .in("status", ["active", "trialing", "past_due"])
        .maybeSingle()

      if (sub?.stripe_subscription_id) {
        const subData = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
          expand: ["items.data"],
        })
        const seatItem = subData.items.data.find(
          (item) => item.price.id === seatPriceId
        )

        if (seatItem) {
          const newQty = (seatItem.quantity || 1) - 1
          if (newQty <= 0) {
            await stripe.subscriptionItems.del(seatItem.id, {
              proration_behavior: "create_prorations",
            })
          } else {
            await stripe.subscriptionItems.update(seatItem.id, {
              quantity: newQty,
              proration_behavior: "create_prorations",
            })
          }
        }
      }
    } catch (e) {
      console.error("Stripe seat decrement error:", e)
      // Still allow deletion — don't block removing members due to billing error
    }
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .eq("account_id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
