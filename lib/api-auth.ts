import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// Service-role client for DB operations
export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

// Verify the caller's JWT and return their user ID (resolves team member → account owner)
export async function requireAuth(req: Request): Promise<{ userId: string } | NextResponse> {
  // Try Authorization header first (Bearer token)
  const authHeader = req.headers.get("authorization")
  let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  // Fall back to Supabase auth cookies
  if (!token) {
    try {
      const cookieStore = await cookies()
      const allCookies = cookieStore.getAll()
      const sbCookie = allCookies.find(c => c.name.includes("auth-token"))
      if (sbCookie) token = sbCookie.value
    } catch {
      // cookies() may throw in some contexts
    }
  }

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify JWT with Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check team member context — resolve to the account owner's ID
  const svc = getServiceSupabase()
  const { data: teamMember } = await svc
    .from("team_members")
    .select("account_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  return {
    userId: teamMember?.account_id || user.id,
  }
}
