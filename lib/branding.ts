import { getServiceSupabase } from "@/lib/api-auth"

export type Branding = {
  company_name: string
  primary_color: string
  logo_url: string
}

const DEFAULT_BRANDING: Branding = {
  company_name: "XRoof",
  primary_color: "#059669",
  logo_url: "",
}

/** Fetch contractor branding from profiles table. Use on server-side API routes. */
export async function getContractorBranding(contractorId: string): Promise<Branding> {
  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from("profiles")
    .select("company_name, widget_color, logo_url")
    .eq("id", contractorId)
    .single()

  if (!data) return DEFAULT_BRANDING

  return {
    company_name: data.company_name || DEFAULT_BRANDING.company_name,
    primary_color: data.widget_color || DEFAULT_BRANDING.primary_color,
    logo_url: data.logo_url || "",
  }
}
