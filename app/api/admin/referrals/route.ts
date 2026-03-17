import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  const [codesResult, conversionsResult] = await Promise.all([
    supabase
      .from("referral_codes")
      .select("*, profiles:user_id(id, full_name, email, company_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("referral_conversions")
      .select(
        "*, referrer:referrer_id(id, full_name, email, company_name), referred:referred_id(id, full_name, email, company_name)"
      )
      .order("created_at", { ascending: false }),
  ])

  if (codesResult.error) {
    console.error("Error fetching referral codes:", codesResult.error)
    return NextResponse.json({ error: "Failed to fetch codes" }, { status: 500 })
  }
  if (conversionsResult.error) {
    console.error("Error fetching referral conversions:", conversionsResult.error)
    return NextResponse.json({ error: "Failed to fetch conversions" }, { status: 500 })
  }

  const codes = codesResult.data || []
  const conversions = conversionsResult.data || []

  // Build top referrers from codes data
  const referrerMap = new Map<string, { user_id: string; company_name: string; referral_count: number }>()
  for (const conv of conversions) {
    const referrerId = conv.referrer_id as string
    const existing = referrerMap.get(referrerId)
    if (existing) {
      existing.referral_count++
    } else {
      const profile = conv.referrer as { id: string; company_name: string } | null
      referrerMap.set(referrerId, {
        user_id: referrerId,
        company_name: profile?.company_name || "Unknown",
        referral_count: 1,
      })
    }
  }

  const topReferrers = Array.from(referrerMap.values())
    .sort((a, b) => b.referral_count - a.referral_count)
    .slice(0, 10)

  return NextResponse.json({
    codes,
    conversions,
    stats: {
      totalReferrals: conversions.length,
      converted: conversions.filter((c) => c.converted).length,
      topReferrers,
    },
  })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  let body: { user_id: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 })
  }

  // Fetch the contractor's profile for company name
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_name, full_name")
    .eq("id", body.user_id)
    .single()

  if (profileError || !profile) {
    console.error("Error fetching profile:", profileError)
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Slugify company name and append random chars
  const baseName = (profile.company_name || profile.full_name || "contractor")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const randomChars = Math.random().toString(36).substring(2, 6)
  const code = `${baseName}-${randomChars}`

  const { data, error } = await supabase
    .from("referral_codes")
    .insert({ user_id: body.user_id, code })
    .select()
    .single()

  if (error) {
    console.error("Error creating referral code:", error)
    return NextResponse.json({ error: "Failed to create referral code" }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
