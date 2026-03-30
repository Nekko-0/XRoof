import { createClient } from "@supabase/supabase-js"
import { addConnection } from "@/lib/event-emitter"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  // Auth: EventSource can't send headers, so token comes via query param
  const url = new URL(req.url)
  const token = url.searchParams.get("token")
  if (!token) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Resolve team member to account owner
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: teamMember } = await svc
    .from("team_members")
    .select("account_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  const userId = teamMember?.account_id || user.id

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`data: {"type":"connected","timestamp":"${new Date().toISOString()}"}\n\n`))

      const cleanup = addConnection(userId, controller)

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeat)
          cleanup()
        }
      }, 30_000)

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        cleanup()
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
