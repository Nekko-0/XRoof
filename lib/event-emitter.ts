// Server-side event emitter for SSE real-time updates
// Uses in-memory Map of userId → connected SSE response writers
// Works per-instance (Vercel serverless). For multi-instance scaling, use Redis pub/sub.

export type AppEvent = {
  type: "sms_received" | "estimate_viewed" | "payment_received" | "contract_signed" | "notification"
  payload: Record<string, unknown>
  userId: string
  timestamp: string
}

type SSEWriter = {
  controller: ReadableStreamDefaultController
  userId: string
}

const connections = new Map<string, SSEWriter[]>()

/**
 * Register an SSE connection for a user
 */
export function addConnection(userId: string, controller: ReadableStreamDefaultController): () => void {
  const writer: SSEWriter = { controller, userId }
  const existing = connections.get(userId) || []
  existing.push(writer)
  connections.set(userId, existing)

  // Return cleanup function
  return () => {
    const conns = connections.get(userId) || []
    const filtered = conns.filter(c => c !== writer)
    if (filtered.length === 0) {
      connections.delete(userId)
    } else {
      connections.set(userId, filtered)
    }
  }
}

/**
 * Send an event to a specific user's SSE connections
 */
export function emitToUser(userId: string, event: Omit<AppEvent, "userId" | "timestamp">) {
  const conns = connections.get(userId) || []
  const data = JSON.stringify({
    ...event,
    userId,
    timestamp: new Date().toISOString(),
  })

  const message = `data: ${data}\n\n`
  const encoder = new TextEncoder()

  for (const conn of conns) {
    try {
      conn.controller.enqueue(encoder.encode(message))
    } catch {
      // Connection closed, will be cleaned up
    }
  }
}

/**
 * Get count of active connections (for monitoring)
 */
export function getConnectionCount(): number {
  let count = 0
  for (const conns of connections.values()) {
    count += conns.length
  }
  return count
}
