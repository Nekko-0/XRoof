import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")

  let query = supabase
    .from("support_tickets")
    .select("*, profiles:user_id(id, full_name, email, company_name)")
    .order("created_at", { ascending: false })

  if (status) query = query.eq("status", status)
  if (priority) query = query.eq("priority", priority)

  const { data: tickets, error: ticketsError } = await query

  if (ticketsError) {
    console.error("Error fetching tickets:", ticketsError)
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 })
  }

  // Fetch all replies for these tickets
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

  // Calculate stats
  const allTickets = tickets || []
  const open = allTickets.filter((t) => t.status === "open").length
  const inProgress = allTickets.filter((t) => t.status === "in_progress").length
  const resolved = allTickets.filter((t) => t.status === "resolved").length

  // Average response time: time between ticket creation and first admin reply
  let totalResponseTime = 0
  let responseCount = 0

  for (const ticket of allTickets) {
    const ticketReplies = repliesByTicket.get(ticket.id) || []
    const firstAdminReply = ticketReplies.find((r) => r.sender === "admin")
    if (firstAdminReply) {
      const created = new Date(ticket.created_at).getTime()
      const replied = new Date(firstAdminReply.created_at as string).getTime()
      const diffHours = (replied - created) / (1000 * 60 * 60)
      totalResponseTime += diffHours
      responseCount++
    }
  }

  const avgResponseTime = responseCount > 0
    ? Math.round((totalResponseTime / responseCount) * 10) / 10
    : 0

  return NextResponse.json({
    tickets: ticketsWithReplies,
    stats: { open, inProgress, resolved, avgResponseTime },
  })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceSupabase()

  let body: { ticket_id: string; message?: string; status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.ticket_id) {
    return NextResponse.json({ error: "ticket_id is required" }, { status: 400 })
  }

  if (!body.message && !body.status) {
    return NextResponse.json({ error: "message or status is required" }, { status: 400 })
  }

  // Add reply if message provided
  if (body.message) {
    const { error } = await supabase
      .from("ticket_replies")
      .insert({
        ticket_id: body.ticket_id,
        message: body.message,
        sender: "admin",
      })

    if (error) {
      console.error("Error creating ticket reply:", error)
      return NextResponse.json({ error: "Failed to add reply" }, { status: 500 })
    }
  }

  // Update status if provided
  if (body.status) {
    const update: Record<string, unknown> = { status: body.status }
    if (body.status === "resolved") {
      update.resolved_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from("support_tickets")
      .update(update)
      .eq("id", body.ticket_id)

    if (error) {
      console.error("Error updating ticket status:", error)
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
