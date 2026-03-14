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
        // Skip tracking if the opener is the contractor (compare against contractor's email)
        let contractorEmail: string | null = null
        if (sentEvent.job_id) {
          const { data: job } = await supabase
            .from("jobs")
            .select("contractor_id")
            .eq("id", sentEvent.job_id)
            .single()
          if (job?.contractor_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", job.contractor_id)
              .single()
            contractorEmail = profile?.email || null
          }
        }

        // If the recipient email matches the contractor's email, skip tracking
        if (contractorEmail && sentEvent.recipient_email?.toLowerCase() === contractorEmail.toLowerCase()) {
          return new NextResponse(PIXEL, {
            headers: {
              "Content-Type": "image/gif",
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          })
        }

        // Record every customer open
        await supabase.from("document_events").insert({
          job_id: sentEvent.job_id,
          document_type: sentEvent.document_type,
          document_id: sentEvent.document_id,
          event_type: "opened",
          recipient_email: sentEvent.recipient_email,
          metadata: { tracking_event_id: eventId },
        })

        // Fire estimate_viewed automation only on the first open
        if (sentEvent.document_type === "report" && sentEvent.job_id) {
          const { data: priorOpens } = await supabase
            .from("document_events")
            .select("id")
            .eq("document_id", sentEvent.document_id)
            .eq("document_type", sentEvent.document_type)
            .eq("event_type", "opened")
            .limit(2)

          // Only fire automation on first open (the one we just inserted)
          if (priorOpens && priorOpens.length <= 1) {
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
