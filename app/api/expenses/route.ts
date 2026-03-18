import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("job_id")

    const supabase = getServiceSupabase()
    let query = supabase
      .from("expenses")
      .select("*")
      .eq("contractor_id", auth.userId)
      .order("date", { ascending: false })
      .limit(500)

    if (jobId) {
      query = query.eq("job_id", jobId)
    }

    const { data, error } = await query
    if (error) {
      console.error("[XRoof] expenses GET error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
    return NextResponse.json(data || [])
  } catch (err) {
    console.error("[XRoof] expenses GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { job_id, amount, vendor, date, category, description, receipt_url } = body

    if (amount === undefined) {
      return NextResponse.json({ error: "Missing amount" }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        contractor_id: auth.userId,
        job_id: job_id || null,
        amount,
        vendor: vendor || null,
        date: date || new Date().toISOString().split("T")[0],
        category: category || null,
        description: description || null,
        receipt_url: receipt_url || null,
      })
      .select()
      .single()

    if (error) {
      console.error("[XRoof] expenses POST error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error("[XRoof] expenses POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
