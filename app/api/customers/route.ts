import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"
import { CustomerCreateSchema, CustomerUpdateSchema, validateBody } from "@/lib/validations"

// GET — list customers for the authenticated contractor
export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("contractor_id", userId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST — create or find existing customer
export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const body = await req.json()
  const v = validateBody(CustomerCreateSchema, body)
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 })
  const { name, email, phone, address, notes } = v.data!

  // Check for existing customer with same name + phone/email
  if (phone || email) {
    let query = supabase
      .from("customers")
      .select("*")
      .eq("contractor_id", userId)
      .eq("name", name)

    if (phone) query = query.eq("phone", phone)
    else if (email) query = query.eq("email", email)

    const { data: existing } = await query.limit(1)
    if (existing && existing.length > 0) {
      return NextResponse.json(existing[0])
    }
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ contractor_id: userId, name, email: email || null, phone: phone || null, address: address || null, notes: notes || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — update customer
export async function PATCH(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const body = await req.json()
  const v = validateBody(CustomerUpdateSchema, body)
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 })
  const { id, ...updates } = v.data!

  // Verify customer belongs to authenticated user
  const { data: customer } = await supabase
    .from("customers")
    .select("contractor_id")
    .eq("id", id)
    .single()

  if (!customer || customer.contractor_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — remove customer
export async function DELETE(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth
  const supabase = getServiceSupabase()

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  // Verify customer belongs to authenticated user
  const { data: customer } = await supabase
    .from("customers")
    .select("contractor_id")
    .eq("id", id)
    .single()

  if (!customer || customer.contractor_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await supabase.from("customers").delete().eq("id", id)
  return NextResponse.json({ success: true })
}
