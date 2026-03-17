import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const contractorId = searchParams.get("contractor_id")

  if (!contractorId) {
    return NextResponse.json({ error: "Missing contractor_id" }, { status: 400, headers: corsHeaders })
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
    return NextResponse.json({ company_name: "", widget_color: "#059669", logo_url: "" }, { headers: corsHeaders })
  }

  return NextResponse.json({
    company_name: data.company_name || "",
    widget_color: data.widget_color || "#059669",
    logo_url: data.logo_url || "",
  }, { headers: corsHeaders })
}
