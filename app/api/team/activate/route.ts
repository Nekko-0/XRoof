import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

// POST — activate a team member after they sign up
export async function POST(req: Request) {
  const { token, user_id, name } = await req.json()

  if (!token || !user_id) {
    return NextResponse.json({ error: "Missing token or user_id" }, { status: 400 })
  }

  // Find the invite
  const { data: invite, error: invErr } = await supabase
    .from("team_members")
    .select("id, account_id, role, status")
    .eq("invite_token", token)
    .single()

  if (invErr || !invite) {
    return NextResponse.json({ error: "Invalid invite token" }, { status: 404 })
  }

  if (invite.status === "active") {
    return NextResponse.json({ error: "Already activated" }, { status: 410 })
  }

  // 1. Update team_members: set user_id, status=active, clear token
  const { error: updateErr } = await supabase
    .from("team_members")
    .update({
      user_id,
      status: "active",
      invite_token: null,
      invited_name: name || undefined,
    })
    .eq("id", invite.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // 2. Set parent_account_id on the new user's profile
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ parent_account_id: invite.account_id })
    .eq("id", user_id)

  if (profileErr) {
    // Profile might not exist yet (trigger delay). Try upsert.
    await supabase
      .from("profiles")
      .upsert({
        id: user_id,
        parent_account_id: invite.account_id,
        username: name || "",
      })
  }

  return NextResponse.json({ success: true })
}
