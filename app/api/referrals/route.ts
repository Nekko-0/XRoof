import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const user = await requireAuth(req)
  if (user instanceof NextResponse) return user

  try {
    const supabase = getServiceSupabase()

    // Get user's referral code
    const { data: codeData } = await supabase
      .from("referral_codes")
      .select("id, code, created_at")
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Get referral conversions (people they referred)
    const { data: conversions } = await supabase
      .from("referral_conversions")
      .select("id, referred_id, converted, reward_amount, created_at")
      .eq("referrer_id", user.userId)
      .order("created_at", { ascending: false })

    const totalReferred = conversions?.length || 0
    const totalConverted = conversions?.filter((c) => c.converted).length || 0
    const totalEarned = conversions
      ?.filter((c) => c.converted)
      .reduce((sum, c) => sum + (c.reward_amount || 0), 0) || 0

    return NextResponse.json({
      code: codeData?.code || null,
      stats: {
        totalReferred,
        totalConverted,
        totalEarned: totalEarned / 100, // cents to dollars
      },
    })
  } catch (err) {
    console.error("[XRoof] referrals GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await requireAuth(req)
  if (user instanceof NextResponse) return user

  try {
    const supabase = getServiceSupabase()

    // Check if already has a code
    const { data: existing } = await supabase
      .from("referral_codes")
      .select("id, code")
      .eq("user_id", user.userId)
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json({ code: existing.code })
    }

    // Generate code from company name
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name, full_name")
      .eq("id", user.userId)
      .single()

    const baseName = (profile?.company_name || profile?.full_name || "contractor")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    const randomChars = Math.random().toString(36).substring(2, 6)
    const code = `${baseName}-${randomChars}`

    const { data, error } = await supabase
      .from("referral_codes")
      .insert({ user_id: user.userId, code })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ code: data.code })
  } catch (err) {
    console.error("[XRoof] referrals POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
