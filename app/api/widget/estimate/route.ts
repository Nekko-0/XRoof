import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { sendSMS } from "@/lib/twilio"
import { rateLimit, getClientIP } from "@/lib/rate-limit"
import { checkOrigin } from "@/lib/csrf"

const PITCH_DATA = [
  { pitch: "1/12", degrees: 4.76 },
  { pitch: "2/12", degrees: 9.46 },
  { pitch: "3/12", degrees: 14.04 },
  { pitch: "4/12", degrees: 18.43 },
  { pitch: "5/12", degrees: 22.62 },
  { pitch: "6/12", degrees: 26.57 },
  { pitch: "7/12", degrees: 30.26 },
  { pitch: "8/12", degrees: 33.69 },
  { pitch: "9/12", degrees: 36.87 },
  { pitch: "10/12", degrees: 39.81 },
  { pitch: "11/12", degrees: 42.51 },
  { pitch: "12/12", degrees: 45.0 },
]

function pitchFromDegrees(deg: number): string {
  let closest = PITCH_DATA[0]
  let minDiff = Math.abs(deg - closest.degrees)
  for (const p of PITCH_DATA) {
    const diff = Math.abs(deg - p.degrees)
    if (diff < minDiff) { minDiff = diff; closest = p }
  }
  return closest.pitch
}

function azimuthToDirection(az: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  return dirs[Math.round(az / 45) % 8]
}

export async function POST(req: Request) {
  const csrf = checkOrigin(req)
  if (csrf) return csrf

  const ip = getClientIP(req)
  const rl = rateLimit(`widget-estimate:${ip}`, 20, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const { contractor_id, address, customer_name, customer_email, customer_phone } = await req.json()

  if (!contractor_id || !address) {
    return NextResponse.json({ error: "Missing contractor_id or address" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // Get contractor's widget settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("widget_price_per_sqft, company_name, phone")
    .eq("id", contractor_id)
    .single()

  const pricePerSqft = profile?.widget_price_per_sqft || 4.5

  // Try Google Solar API for roof area estimate
  let roofSqft: number | null = null
  let segments: { area_sqft: number; pitch: string; azimuth: string }[] = []
  let segment_count = 0
  let primary_pitch: string | null = null
  let pitch_range: string | null = null
  let lat: number | null = null
  let lng: number | null = null
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  if (googleApiKey) {
    try {
      // Geocode the address first
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleApiKey}`
      )
      const geoData = await geoRes.json()

      if (geoData.results?.[0]) {
        const loc = geoData.results[0].geometry.location
        lat = loc.lat
        lng = loc.lng

        // Try Solar API
        const solarRes = await fetch(
          `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${googleApiKey}`
        )

        if (solarRes.ok) {
          const solarData = await solarRes.json()
          roofSqft = solarData.solarPotential?.wholeRoofStats?.areaMeters2
          if (roofSqft) {
            roofSqft = Math.round(roofSqft * 10.7639) // m² to sqft
          }

          // Extract per-segment data (pitch, azimuth, area)
          const rawSegments = solarData.solarPotential?.roofSegmentStats
          if (Array.isArray(rawSegments) && rawSegments.length > 0) {
            segments = rawSegments.map((seg: any) => ({
              area_sqft: Math.round((seg.stats?.areaMeters2 || 0) * 10.7639),
              pitch: pitchFromDegrees(seg.pitchDegrees || 0),
              azimuth: azimuthToDirection(seg.azimuthDegrees || 0),
            }))
            segment_count = segments.length

            // Primary pitch = pitch of largest segment
            const sorted = [...segments].sort((a, b) => b.area_sqft - a.area_sqft)
            primary_pitch = sorted[0].pitch

            // Pitch range from unique pitches
            const pitches = [...new Set(segments.map((s) => s.pitch))]
            if (pitches.length === 1) {
              pitch_range = pitches[0]
            } else {
              const pitchNums = pitches.map((p) => parseInt(p.split("/")[0]))
              pitch_range = `${Math.min(...pitchNums)}/12 – ${Math.max(...pitchNums)}/12`
            }
          }
        }
      }
    } catch {
      // Solar API not available, use fallback
    }
  }

  // Fallback estimate based on typical home
  if (!roofSqft) {
    roofSqft = 1800 // average US home roof size
  }

  const estimateLow = Math.round(roofSqft * pricePerSqft * 0.85 / 100) * 100
  const estimateHigh = Math.round(roofSqft * pricePerSqft * 1.15 / 100) * 100

  // If lead info provided, create a job + alert contractor
  if (customer_name && (customer_email || customer_phone)) {
    const { data: newJob } = await supabase.from("jobs").insert({
      contractor_id,
      customer_name,
      customer_phone: customer_phone || "",
      address,
      zip_code: address.match(/\b\d{5}\b/)?.[0] || "",
      job_type: "Roof Replacement",
      description: `Widget lead — Estimated ${roofSqft} sqft roof, $${estimateLow.toLocaleString()}-$${estimateHigh.toLocaleString()}`,
      status: "New",
      budget: Math.round((estimateLow + estimateHigh) / 2),
      source: "widget",
    }).select("id").single()

    // Fire new_lead automation trigger
    if (newJob?.id) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      fetch(`${appUrl}/api/automations/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "new_lead", job_id: newJob.id, contractor_id, internal_secret: process.env.CRON_SECRET }),
      }).catch((err: unknown) => console.error("[XRoof] fire-and-forget error:", err))
    }

    // Instant SMS alert to contractor
    if (profile?.phone) {
      await sendSMS(
        profile.phone,
        `New lead! ${customer_name} at ${address} — est. $${estimateLow.toLocaleString()}-$${estimateHigh.toLocaleString()}. Check your dashboard.`
      ).catch((err: unknown) => console.error("[XRoof] fire-and-forget error:", err)) // Don't fail the request if SMS fails
    }
  }

  return NextResponse.json({
    roof_sqft: roofSqft,
    estimate_low: estimateLow,
    estimate_high: estimateHigh,
    company_name: profile?.company_name || "",
    segments,
    segment_count,
    primary_pitch,
    pitch_range,
    lat,
    lng,
  })
}
