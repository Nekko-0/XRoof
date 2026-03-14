import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
)

export async function GET(req: Request) {
  const url = new URL(req.url)
  const eventId = url.searchParams.get("eid")

  if (eventId) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      )

      // Look up the original "sent" event to get job info
      const { data: sentEvent } = await supabase
        .from("document_events")
        .select("job_id, document_type, document_id, recipient_email")
        .eq("id", eventId)
        .single()

      if (sentEvent) {
        // Only record one "opened" event per document to avoid counting contractor previews
        const { data: existing } = await supabase
          .from("document_events")
          .select("id")
          .eq("document_id", sentEvent.document_id)
          .eq("document_type", sentEvent.document_type)
          .eq("event_type", "opened")
          .limit(1)

        if (existing && existing.length > 0) {
          // Already recorded an open — skip duplicate
          return new NextResponse(PIXEL, {
            headers: {
              "Content-Type": "image/gif",
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          })
        }

        await supabase.from("document_events").insert({
          job_id: sentEvent.job_id,
          document_type: sentEvent.document_type,
          document_id: sentEvent.document_id,
          event_type: "opened",
          recipient_email: sentEvent.recipient_email,
          metadata: { tracking_event_id: eventId },
        })

        // Fire estimate_viewed automation trigger
        if (sentEvent.document_type === "report" && sentEvent.job_id) {
          const { data: job } = await supabase
            .from("jobs")
            .select("contractor_id")
            .eq("id", sentEvent.job_id)
            .single()
          if (job?.contractor_id) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            fetch(`${appUrl}/api/automations/trigger`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                trigger: "estimate_viewed",
                job_id: sentEvent.job_id,
                contractor_id: job.contractor_id,
                internal_secret: process.env.CRON_SECRET,
              }),
            }).catch((err: unknown) => console.error("[XRoof] fire-and-forget error:", err))
          }
        }
      }
    } catch {
      // Silently fail — tracking should never break the user experience
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
