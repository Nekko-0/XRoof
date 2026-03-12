import { NextResponse } from "next/server"

// Simple in-memory cache (per serverless instance)
let cache: { key: string; data: any; expiry: number } | null = null

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const zip = searchParams.get("zip")
  if (!zip) return NextResponse.json({ error: "Missing zip" }, { status: 400 })

  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) return NextResponse.json({ forecast: [] })

  const cacheKey = `weather_${zip}`
  const now = Date.now()

  // Return cached data if fresh (1 hour)
  if (cache && cache.key === cacheKey && cache.expiry > now) {
    return NextResponse.json(cache.data)
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?zip=${zip},US&units=imperial&appid=${apiKey}`
    )

    if (!res.ok) return NextResponse.json({ forecast: [] })

    const data = await res.json()

    // Extract one forecast per day (noon reading)
    const dailyMap = new Map<string, { date: string; temp: number; description: string; icon: string }>()

    for (const item of data.list || []) {
      const date = item.dt_txt?.split(" ")[0]
      const hour = parseInt(item.dt_txt?.split(" ")[1]?.split(":")[0] || "0")
      if (!date) continue

      // Prefer the noon reading for each day
      if (!dailyMap.has(date) || Math.abs(hour - 12) < Math.abs(parseInt(dailyMap.get(date)!.description) - 12)) {
        dailyMap.set(date, {
          date,
          temp: Math.round(item.main?.temp || 0),
          description: item.weather?.[0]?.main || "",
          icon: item.weather?.[0]?.icon || "",
        })
      }
    }

    const forecast = Array.from(dailyMap.values()).slice(0, 7)
    const result = { forecast }

    // Cache for 1 hour
    cache = { key: cacheKey, data: result, expiry: now + 3600000 }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ forecast: [] })
  }
}
