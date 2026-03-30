"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useEventListener } from "@/components/event-provider"

export function useUnreadPortalCount() {
  const [count, setCount] = useState(0)
  const [uid, setUid] = useState<string | null>(null)

  const fetchCount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (!uid) setUid(user.id)

    const { count: c } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("type", ["portal_message", "visit_request"])
      .eq("read", false)

    setCount(c || 0)
  }, [uid])

  useEffect(() => {
    fetchCount()
    // Backup poll every 30s
    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [fetchCount])

  // Supabase Realtime: instant updates on notification changes
  useEffect(() => {
    if (!uid) return
    const channel = supabase
      .channel("unread-portal-notifications")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${uid}`,
      }, () => fetchCount())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [uid, fetchCount])

  // SSE fallback (works in dev)
  useEventListener("notification", fetchCount)

  return { count, refresh: fetchCount }
}
