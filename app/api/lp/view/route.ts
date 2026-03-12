import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: Request) {
  const { page_id } = await req.json()
  if (!page_id) return NextResponse.json({ error: "Missing page_id" }, { status: 400 })

  // Increment view count
  const { data } = await supabase.from("landing_pages").select("views").eq("id", page_id).single()
  if (data) {
    await supabase.from("landing_pages").update({ views: (data.views || 0) + 1 }).eq("id", page_id)
  }

  return NextResponse.json({ ok: true })
}
