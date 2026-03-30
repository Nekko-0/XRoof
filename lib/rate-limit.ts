// Simple in-memory rate limiter using token bucket algorithm
// Works per-instance (resets on cold start, which is fine for serverless)

type Bucket = { tokens: number; lastRefill: number }
const buckets = new Map<string, Bucket>()

// Clean up old buckets periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60_000 // 1 minute
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  const cutoff = now - 300_000 // remove buckets older than 5 minutes
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(key)
  }
}

/**
 * Check if a request is allowed under the rate limit.
 * @param key - Unique identifier (e.g., userId, IP address)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { allowed, remaining, retryAfterMs }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanup()
  const now = Date.now()
  let bucket = buckets.get(key)

  if (!bucket) {
    bucket = { tokens: limit - 1, lastRefill: now }
    buckets.set(key, bucket)
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 }
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill
  const refill = Math.floor((elapsed / windowMs) * limit)

  if (refill > 0) {
    bucket.tokens = Math.min(limit, bucket.tokens + refill)
    bucket.lastRefill = now
  }

  if (bucket.tokens > 0) {
    bucket.tokens--
    return { allowed: true, remaining: bucket.tokens, retryAfterMs: 0 }
  }

  // Track repeated rate limit hits for suspicious activity alerting
  trackRateLimitHit(key)

  // Calculate retry-after
  const timeUntilRefill = windowMs - elapsed
  return { allowed: false, remaining: 0, retryAfterMs: Math.max(timeUntilRefill, 1000) }
}

// Suspicious activity tracking — alert when same key hits rate limit 3+ times in 5 minutes
const hitCounts = new Map<string, { count: number; firstHit: number }>()

function trackRateLimitHit(key: string) {
  const now = Date.now()
  const WINDOW = 5 * 60_000 // 5 minutes
  const THRESHOLD = 3

  let entry = hitCounts.get(key)
  if (!entry || now - entry.firstHit > WINDOW) {
    entry = { count: 1, firstHit: now }
    hitCounts.set(key, entry)
    return
  }

  entry.count++
  if (entry.count === THRESHOLD) {
    console.warn(
      `[XRoof SECURITY] Suspicious activity: rate limit hit ${THRESHOLD}+ times in 5min | key=${key} | time=${new Date().toISOString()}`
    )
  }

  // Clean up old entries periodically
  if (hitCounts.size > 1000) {
    for (const [k, v] of hitCounts) {
      if (now - v.firstHit > WINDOW) hitCounts.delete(k)
    }
  }
}

/**
 * Extract client IP from request headers (works behind proxies/Vercel)
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}
