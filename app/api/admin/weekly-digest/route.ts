import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/api-auth"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const PLAN_PRICES: Record<string, number> = { monthly: 199, annual: 169 }
const TEAM_MEMBER_PRICE = 39

export async function GET(req: Request) {
  try {
    // Auth: accept either CRON_SECRET or admin auth
    const cronAuth = req.headers.get("authorization")
    if (cronAuth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getServiceSupabase()
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekAgoISO = weekAgo.toISOString()
    const dateLabel = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!adminEmail) {
      return NextResponse.json({ error: "Admin email not configured" }, { status: 500 })
    }

    const { data: activeSubs } = await supabase
      .from("subscriptions").select("plan, user_id").eq("status", "active")

    const activeSubsList = activeSubs || []
    const subscriberIds = activeSubsList.map(s => s.user_id)
    let totalTeamMembers = 0
    if (subscriberIds.length > 0) {
      const { count } = await supabase
        .from("team_members").select("*", { count: "exact", head: true })
        .in("account_id", subscriberIds).eq("status", "active")
      totalTeamMembers = count || 0
    }

    let mrr = 0
    for (const sub of activeSubsList) {
      mrr += PLAN_PRICES[sub.plan] || PLAN_PRICES.monthly
    }
    mrr += totalTeamMembers * TEAM_MEMBER_PRICE

    const [
      { count: trials },
      { count: churnedThisWeek },
      { count: newSignups },
      { count: recentJobs },
      { count: recentInvoices },
      { count: recentReports },
      { data: alerts },
    ] = await Promise.all([
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "trialing"),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "canceled").gte("updated_at", weekAgoISO),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgoISO),
      supabase.from("jobs").select("*", { count: "exact", head: true }).gte("created_at", weekAgoISO),
      supabase.from("invoices").select("*", { count: "exact", head: true }).gte("created_at", weekAgoISO),
      supabase.from("reports").select("*", { count: "exact", head: true }).gte("created_at", weekAgoISO),
      supabase.from("alert_history").select("message, triggered_at").gte("triggered_at", weekAgoISO).order("triggered_at", { ascending: false }).limit(10),
    ])

    const alertsList = (alerts || []).map((a: any) => `<li>${a.message}</li>`).join("")
    const alertsSection = alertsList
      ? `<div style="margin-top:24px;"><h3 style="color:#d32f2f;font-size:16px;margin:0 0 12px;">Alerts</h3><ul style="color:#555;font-size:14px;padding-left:20px;margin:0;">${alertsList}</ul></div>`
      : ""

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<div style="background:#1a1a2e;padding:32px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:24px;">XRoof Weekly Digest</h1>
<p style="color:#a0a0b8;margin:8px 0 0;font-size:14px;">${dateLabel}</p></div>
<div style="padding:32px;">
<h2 style="color:#1a1a2e;font-size:18px;margin:0 0 20px;">Key Metrics</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
<tr><td style="padding:12px;background:#f8f9fa;border-radius:8px 0 0 0;"><div style="color:#888;font-size:12px;">MRR</div><div style="color:#1a1a2e;font-size:22px;font-weight:700;">$${mrr.toLocaleString()}</div></td>
<td style="padding:12px;background:#f8f9fa;border-radius:0 8px 0 0;"><div style="color:#888;font-size:12px;">Active Subs</div><div style="color:#1a1a2e;font-size:22px;font-weight:700;">${activeSubsList.length}</div></td></tr>
<tr><td style="padding:12px;background:#f8f9fa;border-radius:0 0 0 8px;"><div style="color:#888;font-size:12px;">Trials</div><div style="color:#1a1a2e;font-size:22px;font-weight:700;">${trials || 0}</div></td>
<td style="padding:12px;background:#f8f9fa;border-radius:0 0 8px 0;"><div style="color:#888;font-size:12px;">Team Members</div><div style="color:#1a1a2e;font-size:22px;font-weight:700;">${totalTeamMembers}</div></td></tr></table>
<h2 style="color:#1a1a2e;font-size:18px;margin:0 0 16px;">This Week</h2>
<div style="margin-bottom:24px;">
<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;"><span style="color:#555;font-size:14px;">New Signups</span><span style="color:#1a1a2e;font-size:14px;font-weight:600;">${newSignups || 0}</span></div>
<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;"><span style="color:#555;font-size:14px;">Churned</span><span style="color:${(churnedThisWeek || 0) > 0 ? '#d32f2f' : '#1a1a2e'};font-size:14px;font-weight:600;">${churnedThisWeek || 0}</span></div>
<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;"><span style="color:#555;font-size:14px;">Jobs Created</span><span style="color:#1a1a2e;font-size:14px;font-weight:600;">${recentJobs || 0}</span></div>
<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;"><span style="color:#555;font-size:14px;">Invoices Sent</span><span style="color:#1a1a2e;font-size:14px;font-weight:600;">${recentInvoices || 0}</span></div>
<div style="display:flex;justify-content:space-between;padding:10px 0;"><span style="color:#555;font-size:14px;">Reports Generated</span><span style="color:#1a1a2e;font-size:14px;font-weight:600;">${recentReports || 0}</span></div></div>
${alertsSection}
<p style="color:#888;font-size:12px;text-align:center;margin:24px 0 0;">XRoof Weekly Digest</p>
</div></div></div></body></html>`

    await resend.emails.send({
      from: "XRoof <noreply@xroof.io>",
      to: adminEmail,
      subject: `XRoof Weekly Digest \u2014 ${dateLabel}`,
      html,
    })

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error("Weekly digest error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
