import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

// Onboarding drip emails — sent on day 0, 1, 3, 5, 7 after signup
const DRIP_EMAILS = [
  {
    dayAfterSignup: 0,
    subject: "Welcome to XRoof — here's how to get started",
    body: `<p>Hey {name},</p>
<p>Welcome to XRoof! You're now set up to manage your roofing business from one platform.</p>
<p>Here's your quickstart checklist:</p>
<ol>
  <li><strong>Complete your profile</strong> — add your logo, company name, and service area</li>
  <li><strong>Add your first lead</strong> — go to My Jobs and click "Add Job"</li>
  <li><strong>Try the satellite measurement tool</strong> — measure any roof without climbing a ladder</li>
</ol>
<p><a href="https://xroof.io/contractor/dashboard" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Your Dashboard</a></p>
<p>Your 7-day free trial is active — you have full access to every feature.</p>
<p>— The XRoof Team</p>`,
  },
  {
    dayAfterSignup: 1,
    subject: "Tip: Add your first lead in 30 seconds",
    body: `<p>Hey {name},</p>
<p>The fastest way to see XRoof in action is to add a real lead.</p>
<p>Go to <strong>My Jobs → Add Job</strong> and enter a customer name, address, and job type. That's it — you'll see it in your pipeline, calendar, and dashboard immediately.</p>
<p><a href="https://xroof.io/contractor/leads" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Add Your First Lead</a></p>
<p>Once you have a lead, you can measure the roof, create an estimate, and send it to the customer — all from one place.</p>
<p>— The XRoof Team</p>`,
  },
  {
    dayAfterSignup: 3,
    subject: "Create your first branded estimate",
    body: `<p>Hey {name},</p>
<p>XRoof estimates aren't just quotes — they're branded proposals with:</p>
<ul>
  <li>Your logo and company colors</li>
  <li>Material options with color swatches</li>
  <li>Pricing tiers (Good / Better / Best)</li>
  <li>Photo galleries</li>
  <li>E-signature for instant approval</li>
</ul>
<p>Try creating one now — open any lead, click <strong>Create Estimate</strong>, and build a proposal in minutes.</p>
<p><a href="https://xroof.io/contractor/reports" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Create an Estimate</a></p>
<p>— The XRoof Team</p>`,
  },
  {
    dayAfterSignup: 5,
    subject: "Set up automations so you never miss a follow-up",
    body: `<p>Hey {name},</p>
<p>Did you know XRoof can automatically follow up with leads for you?</p>
<p>Go to <strong>Automations</strong> and set up rules like:</p>
<ul>
  <li>"When an estimate is sent, follow up by email after 2 days"</li>
  <li>"When a job is completed, send a satisfaction survey"</li>
  <li>"When a lead goes stale for 7 days, send a reminder SMS"</li>
</ul>
<p><a href="https://xroof.io/contractor/automations" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Set Up Automations</a></p>
<p>Automations save hours every week and make sure no lead falls through the cracks.</p>
<p>— The XRoof Team</p>`,
  },
  {
    dayAfterSignup: 7,
    subject: "Your free trial ends today — keep your momentum going",
    body: `<p>Hey {name},</p>
<p>Your 7-day free trial ends today. If you've been using XRoof, you've already seen how much time it saves.</p>
<p>Subscribe now to keep everything running — your leads, estimates, automations, and customer data stay exactly where they are.</p>
<p><a href="https://xroof.io/contractor/billing" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Subscribe Now — $79/mo (Annual)</a></p>
<p>If you have any questions or need help, just reply to this email or open a support ticket at <a href="https://xroof.io/help">xroof.io/help</a>.</p>
<p>— The XRoof Team</p>`,
  },
]

export async function GET(req: Request) {
  try {
    if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabase()
    const now = new Date()
    let sent = 0

    // Get all profiles created in the last 8 days (covers the full drip window)
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .gte("created_at", eightDaysAgo)

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ sent: 0, message: "No new signups in drip window" })
    }

    // Get already-sent drip emails to avoid duplicates
    const { data: sentEmails } = await supabase
      .from("onboarding_drip_log")
      .select("user_id, day_index")
      .in("user_id", profiles.map((p) => p.id))

    const sentSet = new Set((sentEmails || []).map((s) => `${s.user_id}:${s.day_index}`))

    for (const profile of profiles) {
      const signupDate = new Date(profile.created_at)
      const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (24 * 60 * 60 * 1000))

      for (const drip of DRIP_EMAILS) {
        if (daysSinceSignup !== drip.dayAfterSignup) continue
        const key = `${profile.id}:${drip.dayAfterSignup}`
        if (sentSet.has(key)) continue

        const name = profile.full_name?.split(" ")[0] || "there"
        const html = drip.body.replace(/\{name\}/g, name)

        try {
          await resend.emails.send({
            from: "XRoof <noreply@xroof.io>",
            to: profile.email,
            subject: drip.subject,
            html,
          })

          await supabase.from("onboarding_drip_log").insert({
            user_id: profile.id,
            day_index: drip.dayAfterSignup,
            sent_at: now.toISOString(),
          })

          sent++
        } catch (err) {
          console.error(`Failed to send drip day ${drip.dayAfterSignup} to ${profile.email}:`, err)
        }
      }
    }

    return NextResponse.json({ sent, message: `Sent ${sent} onboarding emails` })
  } catch (err) {
    console.error("Onboarding drip cron error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
