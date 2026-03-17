import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("job_id")

    const supabase = getServiceSupabase()

    if (jobId) {
      const { data, error } = await supabase
        .from("satisfaction_surveys")
        .select("*")
        .eq("job_id", jobId)
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }

    const { data, error } = await supabase
      .from("satisfaction_surveys")
      .select("*, jobs(address, customer_name)")
      .eq("contractor_id", auth.userId)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err) {
    console.error("[XRoof] surveys GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, rating, comment } = body

    if (!token || rating === undefined) {
      return NextResponse.json({ error: "Missing token or rating" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Look up survey by token
    const { data: survey, error: lookupError } = await supabase
      .from("satisfaction_surveys")
      .select("id, contractor_id")
      .eq("token", token)
      .single()

    if (lookupError || !survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    // Update with response
    const { error: updateError } = await supabase
      .from("satisfaction_surveys")
      .update({
        rating,
        comment: comment || null,
        submitted_at: new Date().toISOString(),
        google_review_prompted: rating >= 4,
      })
      .eq("id", survey.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // If high rating, fetch contractor's google_review_url
    let google_review_url: string | undefined
    if (rating >= 4) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("google_review_url")
        .eq("id", survey.contractor_id)
        .single()

      google_review_url = profile?.google_review_url || undefined
    }

    return NextResponse.json({ submitted: true, google_review_url })
  } catch (err) {
    console.error("[XRoof] surveys POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
