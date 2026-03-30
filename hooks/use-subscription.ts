"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export function useSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [periodEnd, setPeriodEnd] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .maybeSingle()

      if (sub) {
        setIsSubscribed(true)
        setPlan(sub.plan)
        setStatus(sub.status)
        setPeriodEnd(sub.current_period_end)
      }
      setLoading(false)
    }
    check()
  }, [])

  return { isSubscribed, plan, status, periodEnd, loading }
}
