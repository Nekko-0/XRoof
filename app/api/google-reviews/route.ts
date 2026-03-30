import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"
import { rateLimit, getClientIP } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const ip = getClientIP(req)
  const rl = rateLimit(`google-reviews:${ip}`, 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServiceSupabase()

  // Get contractor's google_place_id and cached data
  const { data: profile } = await supabase
    .from("profiles")
    .select("google_place_id, google_reviews_cache, google_reviews_cached_at, google_review_url")
    .eq("id", auth.userId)
    .single()

  if (!profile?.google_place_id) {
    return NextResponse.json({ error: "No Google Place ID configured" }, { status: 400 })
  }

  // Return cached data if fresh (< 24 hours)
  if (profile.google_reviews_cache && profile.google_reviews_cached_at) {
    const cachedAt = new Date(profile.google_reviews_cached_at).getTime()
    const now = Date.now()
    if (now - cachedAt < 24 * 60 * 60 * 1000) {
      return NextResponse.json(profile.google_reviews_cache)
    }
  }

  // Fetch fresh data from Google Places API
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Google API key not configured" }, { status: 500 })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${profile.google_place_id}&fields=rating,user_ratings_total,reviews&key=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status !== "OK" || !data.result) {
      return NextResponse.json({ error: "Could not fetch reviews", status: data.status }, { status: 404 })
    }

    const reviewData = {
      rating: data.result.rating || 0,
      reviewCount: data.result.user_ratings_total || 0,
      reviews: (data.result.reviews || []).slice(0, 5).map((r: any) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        time: r.relative_time_description,
      })),
    }

    // Cache in profiles table
    await supabase
      .from("profiles")
      .update({
        google_reviews_cache: reviewData,
        google_reviews_cached_at: new Date().toISOString(),
      })
      .eq("id", auth.userId)

    return NextResponse.json(reviewData)
  } catch (err) {
    console.error("[Google Reviews]", err)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}
