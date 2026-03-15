import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const data = url.searchParams.get("d")
  const redirect = url.searchParams.get("r")

  if (data) {
    try {
      const decoded = JSON.parse(Buffer.from(data, "base64url").toString())
      const { job_id, document_type, document_id, recipient_email } = decoded

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      )

      await supabase.from("document_events").insert({
        job_id,
        document_type,
        document_id,
        event_type: "viewed",
        recipient_email,
      })
    } catch {
      // Silently fail
    }
  }

  if (redirect) {
    return NextResponse.redirect(redirect, 302)
  }

  return new NextResponse("Redirecting...", { status: 200 })
}
