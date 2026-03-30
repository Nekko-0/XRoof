import { NextResponse } from "next/server"
import { getGoogleAuthUrl, exchangeCodeForTokens } from "@/lib/google-calendar"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

// GET — handle both initiating OAuth and callback
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  // Step 2: Callback from Google — exchange code for tokens (no auth needed, Google redirects here)
  if (code && state) {
    try {
      const tokens = await exchangeCodeForTokens(code)

      if (tokens.refresh_token) {
        const supabase = getServiceSupabase()
        await supabase
          .from("profiles")
          .update({
            google_refresh_token: tokens.refresh_token,
            google_calendar_connected: true,
          })
          .eq("id", state)
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      return NextResponse.redirect(`${appUrl}/contractor/settings?tab=integrations&gcal=connected`)
    } catch (err) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      return NextResponse.redirect(`${appUrl}/contractor/settings?tab=integrations&gcal=error`)
    }
  }

  // Step 1: Initiate OAuth — requires auth
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const url = getGoogleAuthUrl(userId)
  return NextResponse.redirect(url)
}
