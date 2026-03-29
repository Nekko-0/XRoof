import { supabase } from "./supabaseClient"

/**
 * Fetch wrapper that automatically attaches the Supabase auth token.
 * Use this instead of plain fetch() for authenticated API routes.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token: string | undefined
  try {
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token
  } catch (err) {
    console.error("authFetch getSession failed:", err)
  }

  const headers = new Headers(options.headers)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(url, { ...options, headers })
}

/**
 * Query contractor data via server-side API route (bypasses RLS).
 * Replaces client-side supabase.from() calls for performance.
 */
export async function contractorQuery(
  table: string,
  params: Record<string, string> = {}
): Promise<{ data: any; count?: number }> {
  const qs = new URLSearchParams({ table, ...params })
  const res = await authFetch(`/api/contractor-query?${qs}`)

  if (!res.ok) {
    console.error("contractorQuery failed:", res.status, table)
    return { data: [] }
  }

  const json = await res.json()

  // Handle error responses from API
  if (json && json.error && !Array.isArray(json)) {
    console.error("contractorQuery error:", json.error, table)
    return { data: params.single === "true" ? null : [] }
  }

  // Handle count-only responses
  if (json && typeof json.count === "number" && !Array.isArray(json)) {
    return { data: null, count: json.count }
  }

  return { data: json }
}
