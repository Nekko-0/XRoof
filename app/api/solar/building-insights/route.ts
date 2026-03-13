import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // Rate limit: 20 Solar API calls per minute per user
  const rl = rateLimit(`solar:${auth.userId}`, 20, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const { lat, lng } = await req.json()
  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_SOLAR_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Solar API not configured" }, { status: 500 })
  }

  try {
    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${apiKey}`

    const res = await fetch(url)
    if (!res.ok) {
      // Try again with MEDIUM quality if HIGH not available
      const urlMedium = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=MEDIUM&key=${apiKey}`
      const res2 = await fetch(urlMedium)
      if (!res2.ok) {
        return NextResponse.json({
          error: "No roof data available for this address",
          available: false
        }, { status: 404 })
      }
      const data = await res2.json()
      return NextResponse.json(transformSolarData(data))
    }

    const data = await res.json()
    return NextResponse.json(transformSolarData(data))
  } catch (err) {
    console.error("[Solar API]", err)
    return NextResponse.json({ error: "Solar API request failed" }, { status: 500 })
  }
}

type SolarSegment = {
  pitchDegrees: number
  azimuthDegrees: number
  stats: {
    areaMeters2: number
    sunshineQuantiles: number[]
    groundAreaMeters2: number
  }
  center: { latitude: number; longitude: number }
  boundingBox: {
    sw: { latitude: number; longitude: number }
    ne: { latitude: number; longitude: number }
  }
  planeHeightAtCenterMeters: number
}

type TransformedSegment = {
  name: string
  points: { lat: number; lng: number }[]
  area_sqft: number
  pitchDegrees: number
  pitchRatio: string
  azimuthDegrees: number
  center: { lat: number; lng: number }
}

function transformSolarData(data: any): { available: boolean; segments: TransformedSegment[]; totalAreaSqft: number; buildingCenter: { lat: number; lng: number } } {
  const solarPanels = data.solarPotential
  if (!solarPanels?.roofSegmentStats || solarPanels.roofSegmentStats.length === 0) {
    return { available: false, segments: [], totalAreaSqft: 0, buildingCenter: { lat: 0, lng: 0 } }
  }

  const segments: TransformedSegment[] = solarPanels.roofSegmentStats
    .filter((seg: SolarSegment) => seg.stats.areaMeters2 > 2) // Skip tiny segments < ~20 sqft
    .sort((a: SolarSegment, b: SolarSegment) => b.stats.areaMeters2 - a.stats.areaMeters2) // Largest first
    .map((seg: SolarSegment, i: number) => {
      const areaSqft = seg.stats.areaMeters2 * 10.7639
      const pitchRatio = degreesToPitchRatio(seg.pitchDegrees)

      // Create polygon from bounding box + center for a more accurate shape
      // Use a diamond/quad approximation based on center and bounding box
      const points = generateRoofPolygon(seg)

      const names = ["Main Roof", "Garage", "Section C", "Section D", "Section E", "Section F", "Section G", "Section H"]
      return {
        name: names[i] || `Section ${i + 1}`,
        points,
        area_sqft: Math.round(areaSqft),
        pitchDegrees: seg.pitchDegrees,
        pitchRatio,
        azimuthDegrees: seg.azimuthDegrees,
        center: { lat: seg.center.latitude, lng: seg.center.longitude },
      }
    })

  const totalAreaSqft = segments.reduce((sum: number, s: TransformedSegment) => sum + s.area_sqft, 0)
  const center = data.center || solarPanels.roofSegmentStats[0].center

  return {
    available: true,
    segments,
    totalAreaSqft,
    buildingCenter: { lat: center.latitude, lng: center.longitude },
  }
}

function generateRoofPolygon(seg: SolarSegment): { lat: number; lng: number }[] {
  const { boundingBox, center } = seg
  if (!boundingBox) {
    // Fallback: create small rectangle around center
    const offset = 0.00005 // ~5 meters
    return [
      { lat: center.latitude + offset, lng: center.longitude - offset },
      { lat: center.latitude + offset, lng: center.longitude + offset },
      { lat: center.latitude - offset, lng: center.longitude + offset },
      { lat: center.latitude - offset, lng: center.longitude - offset },
    ]
  }

  const sw = boundingBox.sw
  const ne = boundingBox.ne
  const c = { lat: center.latitude, lng: center.longitude }

  // Create a hexagonal approximation for better roof representation
  // Uses midpoints of bounding box edges + center offsets
  const midN = { lat: ne.latitude, lng: (sw.longitude + ne.longitude) / 2 }
  const midE = { lat: (sw.latitude + ne.latitude) / 2, lng: ne.longitude }
  const midS = { lat: sw.latitude, lng: (sw.longitude + ne.longitude) / 2 }
  const midW = { lat: (sw.latitude + ne.latitude) / 2, lng: sw.longitude }

  // For gable-style roofs, create a ridge line based on azimuth
  const azRad = (seg.azimuthDegrees * Math.PI) / 180
  const ridgeLen = Math.max(ne.latitude - sw.latitude, ne.longitude - sw.longitude) * 0.4

  // Simple polygon: use bounding box corners pulled slightly toward center
  const shrink = 0.15 // Pull corners 15% toward center for more natural shape
  const pts = [
    lerp(sw.latitude, ne.latitude, c.lat, sw.longitude, ne.longitude, c.lng, { lat: ne.latitude, lng: sw.longitude }, shrink),
    lerp(sw.latitude, ne.latitude, c.lat, sw.longitude, ne.longitude, c.lng, { lat: ne.latitude, lng: ne.longitude }, shrink),
    lerp(sw.latitude, ne.latitude, c.lat, sw.longitude, ne.longitude, c.lng, { lat: sw.latitude, lng: ne.longitude }, shrink),
    lerp(sw.latitude, ne.latitude, c.lat, sw.longitude, ne.longitude, c.lng, { lat: sw.latitude, lng: sw.longitude }, shrink),
  ]

  return pts
}

function lerp(
  _swLat: number, _neLat: number, cLat: number,
  _swLng: number, _neLng: number, cLng: number,
  corner: { lat: number; lng: number },
  factor: number
): { lat: number; lng: number } {
  return {
    lat: corner.lat + (cLat - corner.lat) * factor,
    lng: corner.lng + (cLng - corner.lng) * factor,
  }
}

function degreesToPitchRatio(degrees: number): string {
  const pitchTable = [
    { pitch: "1/12", deg: 4.76 },
    { pitch: "2/12", deg: 9.46 },
    { pitch: "3/12", deg: 14.04 },
    { pitch: "4/12", deg: 18.43 },
    { pitch: "5/12", deg: 22.62 },
    { pitch: "6/12", deg: 26.57 },
    { pitch: "7/12", deg: 30.26 },
    { pitch: "8/12", deg: 33.69 },
    { pitch: "9/12", deg: 36.87 },
    { pitch: "10/12", deg: 39.81 },
    { pitch: "11/12", deg: 42.51 },
    { pitch: "12/12", deg: 45.0 },
  ]
  let closest = pitchTable[0]
  let minDiff = Math.abs(degrees - closest.deg)
  for (const entry of pitchTable) {
    const diff = Math.abs(degrees - entry.deg)
    if (diff < minDiff) {
      minDiff = diff
      closest = entry
    }
  }
  return closest.pitch
}
