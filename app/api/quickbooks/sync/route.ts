import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"
import { getQBClient, syncCustomerToQB, syncInvoiceToQB, syncPaymentToQB } from "@/lib/quickbooks"

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const supabase = getServiceSupabase()
  const client = await getQBClient(userId, supabase)
  if (!client) {
    return NextResponse.json({ error: "QuickBooks not connected" }, { status: 400 })
  }

  // Fetch paid invoices that haven't been synced yet
  const { data: invoices, error: invError } = await supabase
    .from("invoices")
    .select("*")
    .eq("contractor_id", userId)
    .eq("status", "paid")
    .is("quickbooks_invoice_id", null)
    .order("paid_at", { ascending: true })
    .limit(50)

  if (invError) {
    return NextResponse.json({ error: invError.message }, { status: 500 })
  }

  if (!invoices?.length) {
    // Update last sync time even if nothing to sync
    await supabase
      .from("profiles")
      .update({ quickbooks_last_sync: new Date().toISOString() })
      .eq("id", userId)

    return NextResponse.json({ synced: 0, errors: [] })
  }

  // Also fetch job details for addresses
  const jobIds = [...new Set(invoices.filter((i) => i.job_id).map((i) => i.job_id))]
  const { data: jobs } = jobIds.length
    ? await supabase.from("jobs").select("id, customer_name, customer_email, customer_phone, address").in("id", jobIds)
    : { data: [] }

  const jobMap = new Map((jobs || []).map((j) => [j.id, j]))

  let synced = 0
  const errors: string[] = []

  for (const invoice of invoices) {
    try {
      const job = invoice.job_id ? jobMap.get(invoice.job_id) : null
      const customerName = invoice.customer_name || job?.customer_name || "Unknown Customer"

      // Find or create QB customer
      const qbCustomer = await syncCustomerToQB(client, {
        name: customerName,
        email: job?.customer_email,
        phone: job?.customer_phone,
        address: job?.address,
      })

      // Create QB invoice
      const qbInvoice = await syncInvoiceToQB(
        client,
        {
          invoice_number: invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`,
          amount: invoice.amount,
          line_items: invoice.line_items,
          customer_name: customerName,
        },
        { Id: qbCustomer.Id, DisplayName: qbCustomer.DisplayName }
      )

      // Record payment since invoice is already paid
      await syncPaymentToQB(
        client,
        invoice.amount,
        { Id: qbCustomer.Id },
        { Id: qbInvoice.Id }
      )

      // Mark invoice as synced
      await supabase
        .from("invoices")
        .update({ quickbooks_invoice_id: qbInvoice.Id })
        .eq("id", invoice.id)

      synced++
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      errors.push(`Invoice ${invoice.invoice_number || invoice.id}: ${msg}`)
    }
  }

  // Update last sync timestamp
  await supabase
    .from("profiles")
    .update({ quickbooks_last_sync: new Date().toISOString() })
    .eq("id", userId)

  return NextResponse.json({ synced, errors })
}
