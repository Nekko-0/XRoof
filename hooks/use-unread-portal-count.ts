"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useEventListener } from "@/components/event-provider"

export function useUnreadPortalCount() {
  const [count, setCount] = useState(0)

  const fetchCount = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { count: c } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("type", ["portal_message", "visit_request"])
      .eq("read", false)

    setCount(c || 0)
  }

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Refresh on SSE events
  useEventListener("notification", fetchCount)

  return count
}
