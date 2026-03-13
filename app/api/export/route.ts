import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"
import { rateLimit } from "@/lib/rate-limit"
import JSZip from "jszip"

export const maxDuration = 30

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // Rate limit: 2 exports per minute per user
  const rl = rateLimit(`export:${auth.userId}`, 2, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many export requests" }, { status: 429 })
  }

  const supabase = getServiceSupabase()
  const uid = auth.userId
  const zip = new JSZip()

  // Jobs/Leads
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, customer_name, customer_phone, customer_email, address, zip_code, job_type, description, budget, status, source, created_at, completed_at, scheduled_date")
    .eq("contractor_id", uid)
    .order("created_at", { ascending: false })

  if (jobs?.length) {
    zip.file("jobs.csv", toCSV(jobs, [
      "id", "customer_name", "customer_phone", "customer_email", "address", "zip_code",
      "job_type", "description", "budget", "status", "source", "created_at", "completed_at", "scheduled_date"
    ]))
  }

  // Customers
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, email, phone, address, notes, created_at")
    .eq("contractor_id", uid)
    .order("created_at", { ascending: false })

  if (customers?.length) {
    zip.file("customers.csv", toCSV(customers, ["id", "name", "email", "phone", "address", "notes", "created_at"]))
  }

  // Invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, customer_name, customer_email, amount, status, notes, created_at, paid_at")
    .eq("contractor_id", uid)
    .order("created_at", { ascending: false })

  if (invoices?.length) {
    zip.file("invoices.csv", toCSV(invoices, [
      "id", "invoice_number", "customer_name", "customer_email", "amount", "status", "notes", "created_at", "paid_at"
    ]))
  }

  // SMS Messages
  const { data: sms } = await supabase
    .from("sms_messages")
    .select("id, phone_number, direction, body, customer_name, status, created_at")
    .eq("contractor_id", uid)
    .order("created_at", { ascending: false })

  if (sms?.length) {
    zip.file("sms_messages.csv", toCSV(sms, [
      "id", "phone_number", "direction", "body", "customer_name", "status", "created_at"
    ]))
  }

  // Work Orders
  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, title, description, status, priority, assigned_name, due_date, completed_at, created_at")
    .eq("contractor_id", uid)
    .order("created_at", { ascending: false })

  if (workOrders?.length) {
    zip.file("work_orders.csv", toCSV(workOrders, [
      "id", "title", "description", "status", "priority", "assigned_name", "due_date", "completed_at", "created_at"
    ]))
  }

  // Appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, title, date, time, type, customer_name, customer_email, notes, created_at")
    .eq("contractor_id", uid)
    .order("date", { ascending: false })

  if (appointments?.length) {
    zip.file("appointments.csv", toCSV(appointments, [
      "id", "title", "date", "time", "type", "customer_name", "customer_email", "notes", "created_at"
    ]))
  }

  const zipBuffer = await zip.generateAsync({ type: "uint8array" })

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="xroof-export-${new Date().toISOString().split("T")[0]}.zip"`,
    },
  })
}

function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return ""
    const str = String(val)
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const header = columns.join(",")
  const body = rows.map(row => columns.map(col => escape(row[col])).join(",")).join("\n")
  return header + "\n" + body
}
