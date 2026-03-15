import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServiceSupabase()
  const { data: profile } = await supabase
    .from("profiles")
    .select("parent_account_id")
    .eq("id", auth.userId)
    .single()

  if (!profile?.parent_account_id) {
    return NextResponse.json({ isOwner: true, role: "owner", accountId: auth.userId })
  }

  // Try by user_id first
  let { data: member } = await supabase
    .from("team_members")
    .select("role, id")
    .eq("user_id", auth.userId)
    .eq("account_id", profile.parent_account_id)
    .single()

  // Fallback by email if user_id wasn't set during activation
  if (!member) {
    const { data: { user } } = await supabase.auth.admin.getUserById(auth.userId)
    if (user?.email) {
      const { data: memberByEmail } = await supabase
        .from("team_members")
        .select("role, id")
        .eq("account_id", profile.parent_account_id)
        .eq("invited_email", user.email)
        .eq("status", "active")
        .single()
      if (memberByEmail) {
        // Self-heal: set the missing user_id
        await supabase.from("team_members").update({ user_id: auth.userId }).eq("id", memberByEmail.id)
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
