import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const contractorId = searchParams.get("contractor_id")

  if (!contractorId) {
    return NextResponse.json({ error: "Missing contractor_id" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data, error } = await supabase
    .from("profiles")
    .select("company_name, widget_color, logo_url")
    .eq("id", contractorId)
    .single()

  if (error || !data) {
    return NextResponse.json({ company_name: "", widget_color: "#059669", logo_url: "" })
  }

  return NextResponse.json({
    company_name: data.company_name || "",
    widget_color: data.widget_color || "#059669",
    logo_url: data.logo_url || "",
  })
}
