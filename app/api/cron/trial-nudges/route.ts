import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(req: Request) {
  try {
    if (
      req.headers.get("authorization") !==
      `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabase()

    // Get all trialing subscriptions with profile info
    const { data: trialingSubs, error: subsError } = await supabase
      .from("subscriptions")
      .select("id, user_id, created_at, profiles!subscriptions_user_id_fkey(full_name, email)")
      .eq("status", "trialing")

    if (subsError) {
      console.error("Error fetching trialing subscriptions:", subsError)
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      )
    }

    // Get all enabled templates
    const { data: templates, error: templatesError } = await supabase
      .from("trial_nudge_templates")
      .select("*")
      .eq("enabled", true)

    if (templatesError) {
      console.error("Error fetching templates:", templatesError)
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      )
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({ sent: 0, message: "No enabled templates" })
    }

    const now = new Date()
    let sent = 0

    for (const sub of trialingSubs || []) {
      const profileData = sub.profiles as any
      const profile = Array.isArray(profileData) ? profileData[0] : profileData
      if (!profile?.email) continue

      const daysSinceCreated = Math.floor(
        (now.getTime() - new Date(sub.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )

      // Find templates matching this day
      const matchingTemplates = templates.filter(
        (t) => t.day === daysSinceCreated
      )

      for (const template of matchingTemplates) {
        // Check if already sent for this user + day
        const { count: alreadySent } = await supabase
          .from("trial_nudge_log")
          .select("*", { count: "exact", head: true })
          .eq("user_id", sub.user_id)
          .eq("template_id", template.id)

        if ((alreadySent || 0) > 0) continue

        // Check condition
        if (template.condition === "no_job") {
          const { count: jobCount } = await supabase
            .from("jobs")
            .select("*", { count: "exact", head: true })
            .eq("contractor_id", sub.user_id)

          if ((jobCount || 0) > 0) continue
        } else if (template.condition === "no_invoice") {
          const { count: invoiceCount } = await supabase
            .from("invoices")
            .select("*", { count: "exact", head: true })
            .eq("contractor_id", sub.user_id)

          if ((invoiceCount || 0) > 0) continue
        }
        // null condition = always send

        // Send email
        const name = profile.full_name || "there"
        const subject = template.subject.replace("{name}", name)
        const body = template.body_html.replace(/{name}/g, name)

        await resend.emails.send({
          from: "XRoof <noreply@xroof.io>",
          to: profile.email,
          subject,
          html: body,
        })

        // Log the send
        const { error: logError } = await supabase
          .from("trial_nudge_log")
          .insert({
            user_id: sub.user_id,
            template_id: template.id,
            day: template.day,
            sent_at: now.toISOString(),
          })

        if (logError) {
          console.error("Error logging trial nudge:", logError)
        }

        sent++
      }
    }

    return NextResponse.json({ sent })
  } catch (err) {
    console.error("Trial nudges cron error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
