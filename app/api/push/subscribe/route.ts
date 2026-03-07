import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // Get the user from the auth header
  const authHeader = req.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { subscription } = await req.json()
  if (!subscription) {
    return NextResponse.json({ error: "Missing subscription" }, { status: 400 })
  }

  // Upsert: delete old subscriptions for this user, insert new one
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)

  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ user_id: user.id, subscription })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
