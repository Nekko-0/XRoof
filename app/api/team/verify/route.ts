import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

// GET — verify an invite token and return invite details
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  const { data: invite, error } = await supabase
    .from("team_members")
    .select("id, account_id, invited_email, invited_name, role, status, invite_expires_at")
    .eq("invite_token", token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 })
  }

  if (invite.status === "active") {
    return NextResponse.json({ error: "This invite has already been accepted" }, { status: 410 })
  }

  // Check if invite has expired
  if (invite.invite_expires_at && new Date(invite.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite has expired. Please ask for a new invitation." }, { status: 410 })
  }

  // Get company name
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, username")
    .eq("id", invite.account_id)
    .single()

  return NextResponse.json({
    invite,
    company_name: profile?.company_name || profile?.username || "",
  })
}
