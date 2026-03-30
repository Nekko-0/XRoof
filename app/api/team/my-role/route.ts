import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  // Do NOT use requireAuth — it resolves team members to the owner's userId.
  // Instead, verify the JWT directly to get the ACTUAL logged-in user's ID.
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const actualUserId = user.id
  const supabase = getServiceSupabase()

  const { data: profile } = await supabase
    .from("profiles")
    .select("parent_account_id")
    .eq("id", actualUserId)
    .single()

  if (!profile?.parent_account_id) {
    // No parent — this user IS the account owner
    return NextResponse.json({ isOwner: true, role: "owner", accountId: actualUserId })
  }

  // Team member — look up their role
  let { data: member } = await supabase
    .from("team_members")
    .select("role, id")
    .eq("user_id", actualUserId)
    .eq("account_id", profile.parent_account_id)
    .single()

  // Fallback by email if user_id wasn't set during activation
  if (!member) {
    const { data: { user: adminUser } } = await supabase.auth.admin.getUserById(actualUserId)
    if (adminUser?.email) {
      const { data: memberByEmail } = await supabase
        .from("team_members")
        .select("role, id")
        .eq("account_id", profile.parent_account_id)
        .eq("invited_email", adminUser.email)
        .eq("status", "active")
        .single()
      if (memberByEmail) {
        // Self-heal: set the missing user_id
        await supabase.from("team_members").update({ user_id: actualUserId }).eq("id", memberByEmail.id)
        member = memberByEmail
      }
    }
  }

  return NextResponse.json({
    isOwner: false,
    role: member?.role || "viewer",
    accountId: profile.parent_account_id,
  })
}
