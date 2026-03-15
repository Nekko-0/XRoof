import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const supabase = getServiceSupabase()

  // Verify the invoice belongs to this contractor
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, contractor_id")
    .eq("id", id)
    .single()

  if (!invoice || invoice.contractor_id !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data: events } = await supabase
    .from("document_events")
    .select("id, event_type, recipient_email, created_at, metadata")
    .eq("document_id", id)
    .eq("document_type", "invoice")
    .order("created_at", { ascending: false })
    .limit(50)

  return NextResponse.json(events || [])
}
