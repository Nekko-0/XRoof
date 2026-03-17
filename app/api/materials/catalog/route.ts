import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const contractorId = searchParams.get("contractor_id")

    const supabase = getServiceSupabase()

    // Fetch active catalog items
    const { data: items, error } = await supabase
      .from("material_catalog")
      .select("id, brand, product_line, color, description, image_url, price_tier")
      .eq("active", true)
      .order("brand")
      .order("product_line")

    console.log("[XRoof] material_catalog query:", { itemCount: items?.length ?? 0, error: error?.message ?? null })

    if (error) return NextResponse.json({ error: error.message, debug: "query_failed" }, { status: 500 })

    let filtered = items || []

    // If contractor_id provided, filter out hidden brands
    if (contractorId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("material_preferences")
        .eq("id", contractorId)
        .single()

      const hiddenBrands: string[] = profile?.material_preferences?.hidden_brands || []
      if (hiddenBrands.length > 0) {
        filtered = filtered.filter((item) => !hiddenBrands.includes(item.brand))
      }
    }

    // Group by brand, then product_line
    const brandMap = new Map<string, { id: string; product_line: string; color: string; description: string; image_url: string; price_tier: string }[]>()
    for (const item of filtered) {
      const list = brandMap.get(item.brand) || []
      list.push({
        id: item.id,
        product_line: item.product_line,
        color: item.color,
        description: item.description,
        image_url: item.image_url,
        price_tier: item.price_tier,
      })
      brandMap.set(item.brand, list)
    }

    const brands = Array.from(brandMap.entries()).map(([name, products]) => ({
      name,
      products,
    }))

    return NextResponse.json({ brands })
  } catch (err) {
    console.error("[XRoof] material catalog error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
