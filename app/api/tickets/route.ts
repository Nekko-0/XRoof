import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServiceSupabase()

  const { data: tickets, error: ticketsError } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })

  if (ticketsError) {
    console.error("Error fetching tickets:", ticketsError)
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 })
  }

  const ticketIds = (tickets || []).map((t) => t.id)
  let replies: Record<string, unknown>[] = []

  if (ticketIds.length > 0) {
    const { data: repliesData, error: repliesError } = await supabase
      .from("ticket_replies")
      .select("*")
      .in("ticket_id", ticketIds)
      .order("created_at", { ascending: true })

    if (repliesError) {
      console.error("Error fetching ticket replies:", repliesError)
    } else {
      replies = repliesData || []
    }
  }

  // Nest replies into tickets
  const repliesByTicket = new Map<string, typeof replies>()
  for (const reply of replies) {
    const tid = reply.ticket_id as string
    if (!repliesByTicket.has(tid)) repliesByTicket.set(tid, [])
    repliesByTicket.get(tid)!.push(reply)
  }

  const ticketsWithReplies = (tickets || []).map((t) => ({
    ...t,
    replies: repliesByTicket.get(t.id) || [],
  }))

  return NextResponse.json(ticketsWithReplies)
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getServiceSupabase()

  let body: {
    subject?: string
    description?: string
    ticket_id?: string
    message?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Create new ticket
  if (body.subject && body.description) {
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: auth.userId,
        subject: body.subject,
        description: body.description,
        status: "open",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating ticket:", error)
      return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  }

  // Reply to existing ticket
  if (body.ticket_id && body.message) {
    // Verify ticket belongs to this user
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("id", body.ticket_id)
      .eq("user_id", auth.userId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("ticket_replies")
      .insert({
        ticket_id: body.ticket_id,
        message: body.message,
        sender: "contractor",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating ticket reply:", error)
      return NextResponse.json({ error: "Failed to add reply" }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  }

  return NextResponse.json(
    { error: "Provide subject+description to create a ticket, or ticket_id+message to reply" },
    { status: 400 }
  )
}
