import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"
import { getQuickBooksAuthUrl, exchangeQBCodeForTokens } from "@/lib/quickbooks"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const realmId = searchParams.get("realmId")
  const state = searchParams.get("state") // userId

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  // Callback from QuickBooks OAuth
  if (code && realmId && state) {
    try {
      const tokens = await exchangeQBCodeForTokens(code)
      const supabase = getServiceSupabase()

      await supabase
        .from("profiles")
        .update({
          quickbooks_realm_id: realmId,
          quickbooks_access_token: tokens.access_token,
          quickbooks_refresh_token: tokens.refresh_token,
          quickbooks_connected: true,
        })
        .eq("id", state)

      return NextResponse.redirect(`${appUrl}/contractor/settings?tab=integrations&qb=connected`)
    } catch (error) {
      console.error("QuickBooks OAuth callback error:", error)
      return NextResponse.redirect(`${appUrl}/contractor/settings?tab=integrations&qb=error`)
    }
  }

  // Initiate OAuth flow
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const authUrl = getQuickBooksAuthUrl(userId)
  return NextResponse.redirect(authUrl)
}

// Disconnect QuickBooks
export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const supabase = getServiceSupabase()
  const { error } = await supabase
    .from("profiles")
    .update({
      quickbooks_realm_id: null,
      quickbooks_access_token: null,
      quickbooks_refresh_token: null,
      quickbooks_connected: false,
      quickbooks_last_sync: null,
    })
    .eq("id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
