import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getCustomTemplate(
  contractorId: string,
  templateType: string
): Promise<{ subject: string; body_html: string } | null> {
  const { data } = await supabase
    .from("email_templates")
    .select("subject, body_html")
    .eq("contractor_id", contractorId)
    .eq("template_type", templateType)
    .limit(1)
    .single()

  return data || null
}

/** Escape HTML special characters to prevent XSS in email bodies */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function renderTemplate(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => escapeHtml(data[key] || `{${key}}`))
}
