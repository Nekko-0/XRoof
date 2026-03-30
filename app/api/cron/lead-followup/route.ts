import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { NextResponse } from "next/server"
import { getCustomTemplate, renderTemplate } from "@/lib/email-template"

const resend = new Resend(process.env.RESEND_API_KEY)

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

// Runs every hour — auto-emails customers who submitted a widget lead 1+ hours ago with no contractor response
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // Find new widget leads older than 1 hour that haven't been auto-followed-up
  const { data: leads } = await supabase
    .from("jobs")
    .select("id, contractor_id, customer_name, customer_email, address")
    .eq("status", "New")
    .eq("auto_followup_sent", false)
    .lte("created_at", oneHourAgo)

  if (!leads || leads.length === 0) {
    return NextResponse.json({ message: "No leads to follow up", count: 0 })
  }

  let sent = 0
  for (const lead of leads) {
    if (!lead.customer_email) {
      // Mark as sent so we don't keep checking leads with no email
      await supabase.from("jobs").update({ auto_followup_sent: true }).eq("id", lead.id)
      continue
    }

    // Get contractor company name
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name, phone")
      .eq("id", lead.contractor_id)
      .single()

    const companyName = profile?.company_name || "Your Contractor"
    const phone = profile?.phone || ""

    // Check for custom email template
    let emailSubject = `Thanks for your roofing inquiry — ${companyName}`
    let emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
          <h2 style="font-size:18px;margin:0 0 10px;">Thank You for Your Request!</h2>
          <p style="font-size:14px;color:#555;">Hi ${lead.customer_name || "there"},</p>
          <p style="font-size:14px;color:#555;">
            We received your roofing estimate request${lead.address ? ` for <strong>${lead.address}</strong>` : ""}.
            A member of our team will be reaching out to you shortly to discuss your project.
          </p>
          ${phone ? `<p style="font-size:14px;color:#555;">In the meantime, feel free to reach us at <strong>${phone}</strong>.</p>` : ""}
          <p style="font-size:14px;color:#555;">Best regards,<br/><strong>${companyName}</strong></p>
          <p style="font-size:10px;color:#aaa;margin-top:20px;">Sent by XRoof</p>
        </div>`
    if (lead.contractor_id) {
      const custom = await getCustomTemplate(lead.contractor_id, "followup")
      if (custom) {
        const data: Record<string, string> = {
          customer_name: lead.customer_name || "",
          company_name: companyName,
          job_address: lead.address || "",
          phone: phone,
        }
        emailSubject = renderTemplate(custom.subject, data)
        emailHtml = `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">${renderTemplate(custom.body_html, data)}</div>`
      }
    }

    await resend.emails.send({
      from: `${companyName} via XRoof <noreply@xroof.io>`,
      to: lead.customer_email,
      subject: emailSubject,
      html: emailHtml,
    })

    await supabase.from("jobs").update({ auto_followup_sent: true }).eq("id", lead.id)
    sent++
  }

  return NextResponse.json({ message: `Sent ${sent} auto follow-up emails`, count: sent })
}
