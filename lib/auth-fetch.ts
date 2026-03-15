import { supabase } from "./supabaseClient"

/**
 * Fetch wrapper that automatically attaches the Supabase auth token.
 * Use this instead of plain fetch() for authenticated API routes.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const headers = new Headers(options.headers)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(url, { ...options, headers })
}
