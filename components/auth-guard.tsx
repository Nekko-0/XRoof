"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase()

// Pages accessible without an active subscription
const SUBSCRIPTION_EXEMPT_PATHS = ["/contractor/billing", "/contractor/settings"]

// Accounts created before launch get free access (grandfathered)
const LAUNCH_DATE = "2026-03-18"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const checkRole = async (session: any) => {
      if (!session) {
        router.push("/auth")
        return false
      }
      if (session.user.email?.toLowerCase() === ADMIN_EMAIL) {
        router.push("/admin/dashboard")
        return false
      }

      // Skip subscription check for exempt pages
      const isExempt = SUBSCRIPTION_EXEMPT_PATHS.some((p) => pathname.startsWith(p))
      if (!isExempt) {
        // Check if account was created before launch (grandfathered)
        const createdAt = session.user.created_at
        if (createdAt && createdAt < LAUNCH_DATE) {
          return true
        }

        // Check for active subscription
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", session.user.id)
          .in("status", ["active", "trialing"])
          .maybeSingle()

        if (!sub) {
          router.push("/contractor/billing")
          return false
        }
      }

      return true
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (await checkRole(session)) {
        setChecked(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/auth")
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (!(await checkRole(session))) {
          setChecked(false)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [router, pathname])

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return <>{children}</>
}
