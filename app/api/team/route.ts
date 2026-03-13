import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("account_id", userId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const body = await req.json()
  const { invited_email, role, invited_name } = body

  if (!invited_email || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Check seat limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("max_team_seats")
    .eq("id", userId)
    .single()

  const maxSeats = profile?.max_team_seats ?? 3

  const { count: currentMembers } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("account_id", userId)
    .in("status", ["active", "invited"])

  if ((currentMembers ?? 0) >= maxSeats) {
    return NextResponse.json(
      { error: `Team member limit reached (${maxSeats} seats). Upgrade your plan or contact support to add more seats.` },
      { status: 403 }
    )
  }

  // Check if already invited
  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("account_id", userId)
    .eq("invited_email", invited_email.toLowerCase())
    .single()

  if (existing) {
    return NextResponse.json({ error: "This email has already been invited" }, { status: 409 })
  }

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      account_id: userId,
      invited_email: invited_email.toLowerCase(),
      invited_name: invited_name || "",
      role,
      status: "invited",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-send invite email
  if (data?.id) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      await fetch(`${appUrl}/api/team/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_member_id: data.id }),
      })
    } catch (e) {
      console.error("Failed to send invite email:", e)
    }
  }

  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  // Verify the team member belongs to the authenticated user's account
  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("id", id)
    .eq("account_id", userId)
    .single()

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("team_members")
    .update(updates)
    .eq("id", id)
    .eq("account_id", userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  // Verify the team member belongs to the authenticated user's account
  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("id", id)
    .eq("account_id", userId)
    .single()

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 })
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .eq("account_id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
