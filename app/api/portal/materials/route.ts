import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/api-auth"
import { sendNotificationBundle } from "@/lib/notify"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("job_id")

    if (!jobId) {
      return NextResponse.json({ error: "Missing job_id" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Look up the job to get contractor_id
    const { data: job } = await supabase
      .from("jobs")
      .select("contractor_id")
      .eq("id", jobId)
      .single()

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Get contractor's material preferences
    const { data: profile } = await supabase
      .from("profiles")
      .select("material_preferences")
      .eq("id", job.contractor_id)
      .single()

    const hiddenBrands: string[] = profile?.material_preferences?.hidden_brands || []

    // Fetch active catalog items
    const { data: items, error } = await supabase
      .from("material_catalog")
      .select("id, brand, product_line, color, description, image_url, price_tier")
      .eq("active", true)
      .order("brand")
      .order("product_line")

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let filtered = items || []
    if (hiddenBrands.length > 0) {
      filtered = filtered.filter((item) => !hiddenBrands.includes(item.brand))
    }

    // Get existing selections for this job
    const { data: selections } = await supabase
      .from("material_selections")
      .select("catalog_item_id")
      .eq("job_id", jobId)

    const selectedIds = new Set((selections || []).map((s: { catalog_item_id: string }) => s.catalog_item_id))

    // Group by brand
    const brandMap = new Map<string, typeof filtered>()
    for (const item of filtered) {
      const list = brandMap.get(item.brand) || []
      list.push(item)
      brandMap.set(item.brand, list)
    }

    const brands = Array.from(brandMap.entries()).map(([name, products]) => ({
      name,
      products,
    }))

    return NextResponse.json({ brands, selectedIds: Array.from(selectedIds) })
  } catch (err) {
    console.error("[XRoof] portal materials GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { job_id, catalog_item_id } = body

    if (!job_id || !catalog_item_id) {
      return NextResponse.json({ error: "Missing job_id or catalog_item_id" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Verify job exists and get contractor_id + customer_name
    const { data: job } = await supabase
      .from("jobs")
      .select("id, contractor_id, customer_name")
      .eq("id", job_id)
      .single()

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Insert selection
    const { error: insertError } = await supabase
      .from("material_selections")
      .insert({
        job_id,
        catalog_item_id,
        selected_by: "homeowner",
      })

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // Get catalog item details for notification
    const { data: catalogItem } = await supabase
      .from("material_catalog")
      .select("brand, product_line, color")
      .eq("id", catalog_item_id)
      .single()

    // Notify contractor
    if (job.contractor_id && catalogItem) {
      sendNotificationBundle({
        userId: job.contractor_id,
        title: "Material selected",
        body: `${job.customer_name || "A customer"} chose ${catalogItem.brand} ${catalogItem.product_line} - ${catalogItem.color}`,
        type: "material_selected",
      }).catch((err) => console.error("[XRoof] material selection notification error:", err))
    }

    return NextResponse.json({ selected: true })
  } catch (err) {
    console.error("[XRoof] portal materials POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
