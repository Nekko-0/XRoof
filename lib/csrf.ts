import { NextResponse } from "next/server"

/**
 * CSRF protection for public form endpoints.
 * Verifies the Origin header matches our app URL to prevent cross-site request forgery.
 * Returns null if valid, or a 403 NextResponse if the origin doesn't match.
 */
export function checkOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const allowedOrigins = [
    new URL(appUrl).origin,
    "http://localhost:3000",
  ]

  // Allow requests with no Origin header (server-to-server, curl, etc.)
  // Browsers always send Origin on cross-origin POST requests
  if (!origin) return null

  if (!allowedOrigins.includes(origin)) {
    console.warn(`[XRoof SECURITY] CSRF blocked: origin=${origin} expected=${allowedOrigins[0]}`)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
}
