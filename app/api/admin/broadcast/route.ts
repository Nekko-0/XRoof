import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// POST: send email to filtered contractors
export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { subject, html, filter } = body // filter: "all" | "active" | "trialing"

  if (!subject || !html) {
    return NextResponse.json({ error: "Missing subject or html" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Get contractor emails based on filter
  let query = supabase.from("profiles").select("email").eq("role", "Contractor").not("email", "is", null)

  if (filter === "active" || filter === "trialing") {
    const { data: subs } = await supabase.from("subscriptions").select("user_id").eq("status", filter)
    const userIds = (subs || []).map(s => s.user_id)
    if (userIds.length === 0) return NextResponse.json({ sent: 0 })
    query = query.in("id", userIds)
  }

  const { data: contractors } = await query
  const emails = (contractors || []).map(c => c.email).filter(Boolean) as string[]

  if (emails.length === 0) return NextResponse.json({ sent: 0 })

  // Send individually (Resend batch)
  let sent = 0
  for (const email of emails) {
    try {
      await resend.emails.send({
        from: "XRoof <updates@xroof.io>",
        to: email,
        subject,
        html,
      })
      sent++
    } catch (err) {
      console.error(`[XRoof] broadcast email error for ${email}:`, err)
    }
  }

  return NextResponse.json({ sent, total: emails.length })
}
