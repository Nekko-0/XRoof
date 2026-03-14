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
  const rl = rateLimit(`portal-messages:${ip}`, 30, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }
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
  const postIp = getClientIP(req)
  const postRl = rateLimit(`portal-messages-post:${postIp}`, 5, 60_000)
  if (!postRl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { job_id, sender, message } = body

    if (!job_id || !sender || !message) {
      return NextResponse.json(
        { error: "Missing required fields: job_id, sender, message" },
        { status: 400 }
      )
    }

    // Public portal endpoint — only homeowners can send from here.
    // Contractors send via authenticated endpoints.
    if (sender !== "homeowner") {
      return NextResponse.json(
        { error: "Unauthorized sender type" },
        { status: 403 }
      )
    }

    // Verify the job exists to prevent blind writes
    const { data: job } = await supabase.from("jobs").select("id").eq("id", job_id).single()
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
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
