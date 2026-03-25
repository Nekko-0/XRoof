import { createClient, SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

// Safe localStorage wrapper — iOS Safari Private Browsing throws on setItem
const safeStorage = {
  getItem: (key: string) => { try { return localStorage.getItem(key) } catch { return null } },
  setItem: (key: string, value: string) => { try { localStorage.setItem(key, value) } catch {} },
  removeItem: (key: string) => { try { localStorage.removeItem(key) } catch {} },
}

function getClient(): SupabaseClient {
  if (typeof window === "undefined") {
    // Server-side: no persistence needed
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
  }
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          storage: safeStorage,
          autoRefreshToken: true,
        },
      }
    )
  }
  return client
}

export const supabase = getClient()
