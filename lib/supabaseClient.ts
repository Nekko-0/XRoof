import { createClient, SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

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
          storage: window.localStorage,
          autoRefreshToken: true,
        },
      }
    )
  }
  return client
}

export const supabase = getClient()
