import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

// Runs daily at 9 AM — fires invoice_overdue trigger for unpaid invoices older than 14 days
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { data: overdueInvoices } = await supabase
    .from("invoices")
    .select("id, job_id, contractor_id")
    .eq("status", "sent")
    .lt("created_at", fourteenDaysAgo.toISOString())
    .limit(100)

  if (!overdueInvoices || overdueInvoices.length === 0) {
    return NextResponse.json({ message: "No overdue invoices", triggered: 0 })
  }

  let triggered = 0

  for (const inv of overdueInvoices) {
    if (!inv.job_id || !inv.contractor_id) continue

    try {
      await fetch(`${appUrl}/api/automations/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: "invoice_overdue",
          job_id: inv.job_id,
          contractor_id: inv.contractor_id,
          internal_secret: process.env.CRON_SECRET,
        }),
      })
      triggered++
    } catch (err) {
      console.error(`[cron:invoice-overdue] trigger failed for job ${inv.job_id}:`, err)
    }
  }

  return NextResponse.json({ message: `Checked ${overdueInvoices.length} overdue invoices`, triggered })
}
