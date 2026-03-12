import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const job_id = searchParams.get("job_id")

  if (!job_id) {
    return NextResponse.json({ error: "Missing job_id" }, { status: 400 })
  }

  const { data: messages, error } = await supabase
    .from("portal_messages")
    .select("id, job_id, sender, message, created_at")
    .eq("job_id", job_id)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: messages || [] })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { job_id, sender, message } = body

    if (!job_id || !sender || !message) {
      return NextResponse.json(
        { error: "Missing required fields: job_id, sender, message" },
        { status: 400 }
      )
    }

    if (sender !== "homeowner" && sender !== "contractor") {
      return NextResponse.json(
        { error: "sender must be 'homeowner' or 'contractor'" },
        { status: 400 }
      )
    }

    const { data: row, error } = await supabase
      .from("portal_messages")
      .insert({ job_id, sender, message })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: row })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
