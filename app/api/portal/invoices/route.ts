import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { rateLimit, getClientIP } from "@/lib/rate-limit"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: Request) {
  const ip = getClientIP(req)
  const rl = rateLimit(`portal-invoices:${ip}`, 30, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const job_id = searchParams.get("job_id")

  if (!job_id) {
    return NextResponse.json({ error: "Missing job_id" }, { status: 400 })
  }

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, status, created_at, line_items, notes")
    .eq("job_id", job_id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[XRoof] portal-invoices GET error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  return NextResponse.json({ invoices: invoices || [] })
}
