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
      return NextResponse.json(transformSolarData(data, lat, lng))
    }

    const data = await res.json()
    return NextResponse.json(transformSolarData(data, lat, lng))
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

// Haversine distance in meters between two lat/lng points
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function transformSolarData(data: any, requestedLat: number, requestedLng: number): {
  available: boolean; segments: TransformedSegment[]; totalAreaSqft: number;
  buildingCenter: { lat: number; lng: number }; error?: string
} {
  const solarPanels = data.solarPotential
  if (!solarPanels?.roofSegmentStats || solarPanels.roofSegmentStats.length === 0) {
    return { available: false, segments: [], totalAreaSqft: 0, buildingCenter: { lat: 0, lng: 0 } }
  }

  const center = data.center || solarPanels.roofSegmentStats[0].center
  const buildingCenter = { lat: center.latitude, lng: center.longitude }

  // Check if the Solar API returned the correct building (within 50m of clicked point)
  const dist = distanceMeters(requestedLat, requestedLng, buildingCenter.lat, buildingCenter.lng)
  if (dist > 50) {
    return {
      available: false,
      segments: [],
      totalAreaSqft: 0,
      buildingCenter,
      error: "wrong_building",
    }
  }

  const segments: TransformedSegment[] = solarPanels.roofSegmentStats
    .filter((seg: SolarSegment) => seg.stats.areaMeters2 > 2)
    .sort((a: SolarSegment, b: SolarSegment) => b.stats.areaMeters2 - a.stats.areaMeters2)
    .map((seg: SolarSegment, i: number) => {
      const areaSqft = seg.stats.areaMeters2 * 10.7639
      const pitchRatio = degreesToPitchRatio(seg.pitchDegrees)
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

  return {
    available: true,
    segments,
    totalAreaSqft,
    buildingCenter,
  }
}

function generateRoofPolygon(seg: SolarSegment): { lat: number; lng: number }[] {
  const { boundingBox, center } = seg
  const c = { lat: center.latitude, lng: center.longitude }

  if (!boundingBox) {
    const offset = 0.00005
    return [
      { lat: c.lat + offset, lng: c.lng - offset },
      { lat: c.lat + offset, lng: c.lng + offset },
      { lat: c.lat - offset, lng: c.lng + offset },
      { lat: c.lat - offset, lng: c.lng - offset },
    ]
  }

  const sw = boundingBox.sw
  const ne = boundingBox.ne

  // Use ground area to compute approximate dimensions
  const groundAreaM2 = seg.stats.groundAreaMeters2 || seg.stats.areaMeters2 * 0.9
  const widthM = Math.sqrt(groundAreaM2) // approximate as square-ish
  const heightM = groundAreaM2 / widthM

  // Convert meters to lat/lng offsets
  const mPerDegLat = 111320
  const mPerDegLng = 111320 * Math.cos(c.lat * Math.PI / 180)
  const halfW = (widthM / 2) / mPerDegLng
  const halfH = (heightM / 2) / mPerDegLat

  // Azimuth = direction the roof slope faces (downhill).
  // Ridge line runs perpendicular to azimuth.
  // Create a trapezoid: ridge (narrower) at top, eaves (wider) at bottom relative to slope direction.
  const azRad = (seg.azimuthDegrees * Math.PI) / 180

  // Ridge direction is perpendicular to azimuth (90 degrees offset)
  const ridgeAngle = azRad - Math.PI / 2

  // Ridge half-length (along the ridge)
  const ridgeHalf = halfW * 0.85
  // Eaves half-length (wider than ridge for trapezoid shape)
  const eavesHalf = halfW * 1.0
  // Distance from center to ridge and eaves
  const toRidge = halfH * 0.45
  const toEaves = halfH * 0.55

  // Ridge points (uphill from center)
  const ridgeDx = Math.sin(azRad) * toRidge
  const ridgeDy = Math.cos(azRad) * toRidge
  // Ridge runs perpendicular
  const rDx = Math.sin(ridgeAngle) * ridgeHalf
  const rDy = Math.cos(ridgeAngle) * ridgeHalf

  // Eaves points (downhill from center)
  const eavesDx = -Math.sin(azRad) * toEaves
  const eavesDy = -Math.cos(azRad) * toEaves
  const eDx = Math.sin(ridgeAngle) * eavesHalf
  const eDy = Math.cos(ridgeAngle) * eavesHalf

  return [
    { lat: c.lat + ridgeDy + rDy, lng: c.lng + ridgeDx + rDx },
    { lat: c.lat + ridgeDy - rDy, lng: c.lng + ridgeDx - rDx },
    { lat: c.lat + eavesDy - eDy, lng: c.lng + eavesDx - eDx },
    { lat: c.lat + eavesDy + eDy, lng: c.lng + eavesDx + eDx },
  ]
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
