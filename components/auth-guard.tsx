"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const ADMIN_EMAIL = "contact@leons-roofing.com"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const checkRole = (session: any) => {
      if (!session) {
        router.push("/auth")
        return false
      }
      if (session.user.email?.toLowerCase() === ADMIN_EMAIL) {
        router.push("/admin/dashboard")
        return false
      }
      return true
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (checkRole(session)) {
        setChecked(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/auth")
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (!checkRole(session)) {
          setChecked(false)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return <>{children}</>
}
