import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const supabase = getServiceSupabase()

  const { data } = await supabase
    .from("scheduled_automations")
    .select("template_id, status")
    .eq("contractor_id", userId)

  if (!data) return NextResponse.json({})

  const stats: Record<string, { pending: number; sent: number; failed: number }> = {}
  for (const row of data) {
    if (!row.template_id) continue
    if (!stats[row.template_id]) {
      stats[row.template_id] = { pending: 0, sent: 0, failed: 0 }
    }
    if (row.status === "pending") stats[row.template_id].pending++
    else if (row.status === "sent") stats[row.template_id].sent++
    else if (row.status === "failed") stats[row.template_id].failed++
  }

  return NextResponse.json(stats)
}
