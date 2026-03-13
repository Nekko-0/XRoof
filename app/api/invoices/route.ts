import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"
import { InvoiceCreateSchema, InvoiceUpdateSchema, validateBody } from "@/lib/validations"
import { rateLimit, getClientIP } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (id) {
    // Public: single invoice lookup for payment pages (/pay/[id])
    // Rate limit public access to prevent enumeration
    const ip = getClientIP(req)
    const rl = rateLimit(`invoice-view:${ip}`, 30, 60_000)
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    // Validate UUID format to prevent enumeration
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, customer_name, customer_email, customer_phone, address, job_type, amount, status, notes, discount, payment_methods, line_items, scope, extra_photo_urls, logo_url, contractor_id, job_id, created_at")
      .eq("id", id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })

    // Get company name for the invoice display
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name, widget_color, logo_url")
      .eq("id", data.contractor_id)
      .single()

    // Get job photos and description if linked to a job
    let photo_urls: string[] = []
    let description = ""
    if (data.job_id) {
      const { data: job } = await supabase
        .from("jobs")
        .select("photo_urls, description")
        .eq("id", data.job_id)
        .single()
      if (job?.photo_urls) photo_urls = job.photo_urls
      if (job?.description) description = job.description
    }

    // Record "viewed" event (fire-and-forget, deduplicate by checking recent views)
    ;(async () => {
      try {
        const { data: recent } = await supabase.from("document_events")
          .select("id")
          .eq("document_id", id)
          .eq("document_type", "invoice")
          .eq("event_type", "viewed")
          .gte("created_at", new Date(Date.now() - 3600_000).toISOString())
          .limit(1)
        if (!recent || recent.length === 0) {
          await supabase.from("document_events").insert({
            job_id: data.job_id || null,
            document_type: "invoice",
            document_id: id,
            event_type: "viewed",
            recipient_email: data.customer_email || "",
          })
        }
      } catch {}
    })()

    return NextResponse.json({ ...data, company_name: profile?.company_name || "", brand_color: profile?.widget_color || "#059669", brand_logo_url: profile?.logo_url || "", photo_urls, description })
  }

  // Authenticated: list invoices for contractor
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const contractorId = searchParams.get("contractor_id")
  if (!contractorId) {
    return NextResponse.json({ error: "Missing contractor_id or id" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("contractor_id", contractorId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const body = await req.json()
  const v = validateBody(InvoiceCreateSchema, body)
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 })
  const { job_id, customer_name, customer_email, customer_phone, address, job_type, amount, notes, discount, payment_methods, line_items, hidden_fields, scope, extra_photo_urls, logo_url } = v.data!

  // Generate invoice number
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      contractor_id: userId,
      job_id: job_id || null,
      customer_name,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      address: address || null,
      job_type: job_type || null,
      amount, // in cents
      invoice_number: invoiceNumber,
      status: "sent",
      notes: notes || null,
      discount: discount || 0,
      payment_methods: payment_methods || ["card"],
      line_items: line_items || [],
      hidden_fields: hidden_fields || [],
      scope: scope || null,
      extra_photo_urls: extra_photo_urls || [],
      logo_url: logo_url || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Record "sent" event for tracking
  if (data) {
    try {
      await supabase.from("document_events").insert({
        job_id: data.job_id || null,
        document_type: "invoice",
        document_id: data.id,
        event_type: "sent",
        recipient_email: data.customer_email || "",
      })
    } catch {}
  }

  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const body = await req.json()
  const iv = validateBody(InvoiceUpdateSchema, body)
  if (iv.error) return NextResponse.json({ error: iv.error }, { status: 400 })
  const { id, ...updates } = iv.data!

  // Verify the invoice belongs to the authenticated user
  const { data: existing, error: lookupError } = await supabase
    .from("invoices")
    .select("contractor_id")
    .eq("id", id)
    .single()

  if (lookupError || !existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  if (existing.contractor_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
