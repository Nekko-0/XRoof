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
