import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase, isAdmin } from "@/lib/api-auth"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = getServiceSupabase()

    const { data: reports, error } = await supabase
      .from("usage_report_log")
      .select("*, profiles!usage_report_log_contractor_id_fkey(full_name, email)")
      .order("sent_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Error fetching usage reports:", error)
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
    }

    return NextResponse.json({ reports: reports || [] })
  } catch (err) {
    console.error("Usage reports GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    if (!isAdmin(auth))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = getServiceSupabase()

    // Get current month boundaries
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" })

    // Get all active contractors
    const { data: contractors, error: contractorsError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "Contractor")

    if (contractorsError) {
      console.error("Error fetching contractors:", contractorsError)
      return NextResponse.json({ error: "Failed to fetch contractors" }, { status: 500 })
    }

    let sentCount = 0

    for (const contractor of contractors || []) {
      if (!contractor.email) continue

      // Jobs created this month
      const { count: jobsCreated } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", contractor.id)
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd)

      // Invoices sent this month
      const { count: invoicesSent } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", contractor.id)
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd)

      // Revenue collected (paid invoices)
      const { data: paidInvoices } = await supabase
        .from("invoices")
        .select("amount")
        .eq("contractor_id", contractor.id)
        .eq("status", "paid")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd)

      const revenueCollected = (paidInvoices || []).reduce(
        (sum: number, inv: { amount: number }) => sum + (inv.amount || 0),
        0
      ) / 100

      // Reports generated this month
      const { count: reportsGenerated } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", contractor.id)
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd)

      // Automations run this month
      const { count: automationsRun } = await supabase
        .from("scheduled_automations")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", contractor.id)
        .eq("status", "sent")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd)

      // Signed contracts this month
      const { count: contractsSigned } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", contractor.id)
        .eq("status", "signed")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd)

      const jobs = jobsCreated || 0
      const invoices = invoicesSent || 0
      const reports = reportsGenerated || 0
      const automations = automationsRun || 0
      const contracts = contractsSigned || 0

      // Calculate hours saved
      const hoursSaved =
        reports * 0.5 + automations * 0.08 + contracts * 0.33
      const hoursSavedRounded = Math.round(hoursSaved * 100) / 100

      // Insert log entry
      await supabase.from("usage_report_log").insert({
        contractor_id: contractor.id,
        month: monthLabel,
        jobs_created: jobs,
        invoices_sent: invoices,
        revenue_collected: revenueCollected,
        reports_generated: reports,
        automations_run: automations,
        hours_saved: hoursSavedRounded,
        sent_at: new Date().toISOString(),
      })

      // Send email
      const html = buildUsageReportEmail({
        name: contractor.full_name || "Contractor",
        month: monthLabel,
        jobsCreated: jobs,
        invoicesSent: invoices,
        revenueCollected,
        reportsGenerated: reports,
        automationsRun: automations,
        hoursSaved: hoursSavedRounded,
      })

      await resend.emails.send({
        from: "XRoof <noreply@xroof.io>",
        to: contractor.email,
        subject: `Your XRoof Monthly Usage Report \u2014 ${monthLabel}`,
        html,
      })

      sentCount++
    }

    return NextResponse.json({ sent: sentCount })
  } catch (err) {
    console.error("Usage reports POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function buildUsageReportEmail(data: {
  name: string
  month: string
  jobsCreated: number
  invoicesSent: number
  revenueCollected: number
  reportsGenerated: number
  automationsRun: number
  hoursSaved: number
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="background:#1a1a2e;padding:32px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:24px;">XRoof Monthly Report</h1>
        <p style="color:#a0a0b8;margin:8px 0 0;font-size:14px;">${data.month}</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#333;font-size:16px;margin:0 0 24px;">Hi ${data.name},</p>
        <p style="color:#555;font-size:14px;margin:0 0 24px;">Here's your activity summary for ${data.month}:</p>

        <div style="display:grid;gap:12px;margin-bottom:24px;">
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#555;font-size:14px;">Jobs Created</span>
            <span style="color:#1a1a2e;font-size:20px;font-weight:700;">${data.jobsCreated}</span>
          </div>
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#555;font-size:14px;">Invoices Sent</span>
            <span style="color:#1a1a2e;font-size:20px;font-weight:700;">${data.invoicesSent}</span>
          </div>
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#555;font-size:14px;">Revenue Collected</span>
            <span style="color:#1a1a2e;font-size:20px;font-weight:700;">$${data.revenueCollected.toLocaleString()}</span>
          </div>
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#555;font-size:14px;">Reports Generated</span>
            <span style="color:#1a1a2e;font-size:20px;font-weight:700;">${data.reportsGenerated}</span>
          </div>
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#555;font-size:14px;">Automations Run</span>
            <span style="color:#1a1a2e;font-size:20px;font-weight:700;">${data.automationsRun}</span>
          </div>
        </div>

        <div style="background:#e8f5e9;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
          <p style="color:#2e7d32;font-size:14px;margin:0 0 4px;">Estimated Time Saved</p>
          <p style="color:#1b5e20;font-size:28px;font-weight:700;margin:0;">${data.hoursSaved} hours</p>
        </div>

        <p style="color:#888;font-size:12px;text-align:center;margin:0;">
          This is an automated report from XRoof. Keep up the great work!
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}
