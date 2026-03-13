import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { reportId } = await params
  const supabase = getServiceSupabase()

  // Verify the report belongs to this contractor
  const { data: report } = await supabase
    .from("reports")
    .select("id, contractor_id")
    .eq("id", reportId)
    .single()

  if (!report || report.contractor_id !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data: events } = await supabase
    .from("document_events")
    .select("id, event_type, recipient_email, created_at, metadata")
    .eq("document_id", reportId)
    .eq("document_type", "report")
    .order("created_at", { ascending: false })
    .limit(50)

  return NextResponse.json(events || [])
}
