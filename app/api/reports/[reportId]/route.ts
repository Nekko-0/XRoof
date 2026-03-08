import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  // Fetch contractor name
  let contractorName = "Unknown"
  if (data.contractor_id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("id", data.contractor_id)
      .single()
    if (profile) contractorName = profile.username
  }

  return NextResponse.json({ ...data, contractor_name: contractorName })
}
