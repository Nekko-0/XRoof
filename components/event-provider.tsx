"use client"

import { createContext, useContext, useEffect, useRef, useCallback, useState, ReactNode } from "react"
import { supabase } from "@/lib/supabaseClient"

type EventHandler = (event: any) => void
type EventType = "sms_received" | "estimate_viewed" | "payment_received" | "contract_signed" | "notification" | "portal_message" | "connected"

type EventContextType = {
  subscribe: (type: EventType, handler: EventHandler) => () => void
  connected: boolean
}

const EventContext = createContext<EventContextType>({
  subscribe: () => () => {},
  connected: false,
})

export function useEvents() {
  return useContext(EventContext)
}

export function useEventListener(type: EventType, handler: EventHandler) {
  const { subscribe } = useEvents()
  useEffect(() => {
    return subscribe(type, handler)
  }, [type, handler, subscribe])
}

export function EventProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef<Map<EventType, Set<EventHandler>>>(new Map())
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const [connected, setConnected] = useState(false)

  const subscribe = useCallback((type: EventType, handler: EventHandler) => {
    const listeners = listenersRef.current
    if (!listeners.has(type)) {
      listeners.set(type, new Set())
    }
    listeners.get(type)!.add(handler)
    return () => {
      listeners.get(type)?.delete(handler)
    }
  }, [])

  const dispatch = useCallback((event: any) => {
    const handlers = listenersRef.current.get(event.type)
    if (handlers) {
      for (const handler of handlers) {
        try { handler(event) } catch {}
      }
    }
  }, [])

  const connect = useCallback(async () => {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const es = new EventSource(`/api/events/stream?token=${session.access_token}`)
    eventSourceRef.current = es

    es.onopen = () => {
      setConnected(true)
      retryCountRef.current = 0
    }

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        dispatch(event)
      } catch {}
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
      eventSourceRef.current = null

      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30_000)
      retryCountRef.current++
      retryTimeoutRef.current = setTimeout(connect, delay)
    }
  }, [dispatch])

  useEffect(() => {
    connect()
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close()
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    }
  }, [connect])

  return (
    <EventContext.Provider value={{ subscribe, connected }}>
      {children}
    </EventContext.Provider>
  )
}
