import { NextResponse } from "next/server"
import { requireAuth, isAdmin, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  if (!isAdmin(auth)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const contractorId = searchParams.get("id")
  if (!contractorId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = getServiceSupabase()

  const [
    { data: profile },
    { data: subscription },
    { count: jobCount },
    { count: invoiceCount },
    { count: reportCount },
    { data: recentJobs },
    { data: recentInvoices },
    { data: recentReports },
    { data: customers },
    { data: teamMembers },
    { data: churnScore },
    { data: recentActivity },
    { data: supportTickets },
    { data: expenses },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", contractorId).single(),
    supabase.from("subscriptions").select("*").eq("user_id", contractorId).order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("contractor_id", contractorId),
    supabase.from("invoices").select("*", { count: "exact", head: true }).eq("contractor_id", contractorId),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("contractor_id", contractorId),
    supabase.from("jobs").select("id, customer_name, address, status, budget, created_at, completed_at").eq("contractor_id", contractorId).order("created_at", { ascending: false }).limit(20),
    supabase.from("invoices").select("id, customer_name, amount, status, created_at").eq("contractor_id", contractorId).order("created_at", { ascending: false }).limit(15),
    supabase.from("reports").select("id, customer_name, created_at, estimate_accepted").eq("contractor_id", contractorId).order("created_at", { ascending: false }).limit(10),
    supabase.from("customers").select("id, name, email, phone, created_at").eq("contractor_id", contractorId).order("created_at", { ascending: false }).limit(20),
    supabase.from("team_members").select("id, invited_name, invited_email, role, status, created_at").eq("account_id", contractorId),
    supabase.from("churn_scores").select("*").eq("user_id", contractorId).order("calculated_at", { ascending: false }).limit(1).single(),
    supabase.from("document_events").select("id, document_type, event_type, recipient_email, created_at, job_id").eq("contractor_id", contractorId).order("created_at", { ascending: false }).limit(20),
    supabase.from("support_tickets").select("id, subject, status, created_at").eq("user_id", contractorId).order("created_at", { ascending: false }).limit(10),
    supabase.from("expenses").select("id, amount, vendor, category, date, job_id").eq("contractor_id", contractorId).order("date", { ascending: false }).limit(15),
  ])

  const invoices = recentInvoices || []
  const paidInvoices = invoices.filter((i: any) => i.status === "paid")
  const totalRevenue = paidInvoices.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0)
  const pendingInvoices = invoices.filter((i: any) => i.status === "sent")
  const pendingInvoiceTotal = pendingInvoices.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0)

  return NextResponse.json({
    profile,
    subscription,
    jobCount: jobCount || 0,
    invoiceCount: invoiceCount || 0,
    reportCount: reportCount || 0,
    recentJobs: recentJobs || [],
    recentInvoices: invoices,
    recentReports: recentReports || [],
    customers: customers || [],
    teamMembers: teamMembers || [],
    churnScore,
    recentActivity: recentActivity || [],
    supportTickets: supportTickets || [],
    expenses: expenses || [],
    totalRevenue,
    pendingInvoiceTotal,
  })
}
