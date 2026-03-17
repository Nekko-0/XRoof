import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from("reminder_templates")
      .select("*")
      .eq("contractor_id", auth.userId)
      .order("step")

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err) {
    console.error("[XRoof] reminder templates GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { step, subject, body_html, include_late_fee_warning } = body

    if (step === undefined || !subject || !body_html) {
      return NextResponse.json({ error: "Missing step, subject, or body_html" }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from("reminder_templates")
      .upsert(
        {
          contractor_id: auth.userId,
          step,
          subject,
          body_html,
          include_late_fee_warning: include_late_fee_warning || false,
        },
        { onConflict: "contractor_id,step" }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error("[XRoof] reminder templates POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
