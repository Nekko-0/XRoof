import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()

  if (!q) {
    return NextResponse.json({ jobs: [], customers: [] })
  }

  const supabase = getServiceSupabase()
  const pattern = `%${q}%`

  const [jobsResult, customersResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, customer_name, address, customer_email, customer_phone, status")
      .eq("contractor_id", userId)
      .or(
        `customer_name.ilike.${pattern},address.ilike.${pattern},customer_email.ilike.${pattern},customer_phone.ilike.${pattern}`
      )
      .limit(5),
    supabase
      .from("customers")
      .select("id, name, email, phone, address")
      .eq("contractor_id", userId)
      .or(
        `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},address.ilike.${pattern}`
      )
      .limit(5),
  ])

  return NextResponse.json({
    jobs: jobsResult.data ?? [],
    customers: customersResult.data ?? [],
  })
}
