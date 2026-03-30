import { getStripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const stripe = getStripe()

  // Parse optional milestone_index from body
  let milestoneIndex: number | undefined
  try {
    const body = await req.json()
    milestoneIndex = body.milestone_index
  } catch {
    // No body — full invoice payment
  }

  // Get invoice
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice already paid" }, { status: 400 })
  }

  // Determine payment amount (milestone or full)
  let paymentAmount = invoice.amount
  let description = `Invoice ${invoice.invoice_number}`
  const milestones = invoice.milestones || []

  if (milestoneIndex !== undefined && milestones[milestoneIndex]) {
    const milestone = milestones[milestoneIndex]
    if (milestone.paid) {
      return NextResponse.json({ error: "This milestone is already paid" }, { status: 400 })
    }
    paymentAmount = milestone.amount
    description = `${milestone.label} — Invoice ${invoice.invoice_number}`
  }

  // Get contractor's connect account
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, company_name")
    .eq("id", invoice.contractor_id)
    .single()

  if (!profile?.stripe_connect_account_id) {
    return NextResponse.json({ error: "Contractor has not connected payment processing" }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  // 1% platform fee
  const applicationFee = Math.round(paymentAmount * 0.01)

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `${invoice.job_type || "Roofing"} — ${invoice.address || "Service"}`,
          description: `${description} from ${profile.company_name || "Contractor"}`,
        },
        unit_amount: paymentAmount,
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: profile.stripe_connect_account_id,
      },
    },
    success_url: `${appUrl}/pay/${id}?success=true${milestoneIndex !== undefined ? `&milestone=${milestoneIndex}` : ""}`,
    cancel_url: `${appUrl}/pay/${id}`,
    metadata: {
      type: "invoice_payment",
      invoice_id: id,
      contractor_id: invoice.contractor_id,
      ...(milestoneIndex !== undefined ? { milestone_index: String(milestoneIndex) } : {}),
    },
  })

  return NextResponse.json({ url: session.url })
}
