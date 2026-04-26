/**
 * Rate limiting and per-user quotas for v8 moonshots.
 *
 * Two layers:
 *  1. Per-IP sliding window (Upstash Ratelimit) — backstop against bursts /
 *     scripts hammering a single endpoint.
 *  2. Per-user daily quota (manual INCR+EXPIRE) — surfaces a meter to the UI
 *     so users can see what they have left. Keys expire at end of UTC day.
 *
 * Both use the project's existing Upstash KV connection (KV_REST_API_*).
 *
 * Usage:
 *   const ip = getClientIp(req)
 *   const rl = await rebuildRateLimit.limit(ip)
 *   if (!rl.success) return Response.json({error:'rate_limited'}, {status:429})
 *
 *   const quota = await consumeRebuildQuota(userId)
 *   if (!quota.ok) return Response.json({error:'quota_exhausted', quota}, {status:429})
 */

import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

// ----------------------------------------------------------------------------
// Redis client (singleton, shared across requests inside a single lambda)
// ----------------------------------------------------------------------------

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (_redis) return _redis
  _redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  })
  return _redis
}

// ----------------------------------------------------------------------------
// Per-IP sliding window limiters
// ----------------------------------------------------------------------------

/**
 * Rebuild endpoint: 30 requests per hour per IP. Generous enough that an
 * authed user with quota left won't hit it; tight enough to stop scripts.
 */
export const rebuildRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  prefix: "ratelimit:rebuild",
  analytics: false,
})

/**
 * Inspire endpoint (image upload): 60/hour. Higher because uploads are
 * cheaper and people will iterate on a single image faster.
 */
export const inspireRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(60, "1 h"),
  prefix: "ratelimit:inspire",
  analytics: false,
})

// ----------------------------------------------------------------------------
// Per-user daily quotas
// ----------------------------------------------------------------------------

export const REBUILD_DAILY_LIMIT = 10
export const INSPIRE_DAILY_LIMIT = 30

export type QuotaStatus = {
  ok: boolean
  used: number
  limit: number
  remaining: number
  resetAt: string // ISO timestamp of next reset (next UTC midnight)
}

/**
 * Returns seconds remaining until the next UTC midnight.
 * Used as the EXPIRE value for daily quota keys.
 */
function secondsUntilUtcMidnight(): number {
  const now = new Date()
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0),
  )
  return Math.ceil((tomorrow.getTime() - now.getTime()) / 1000)
}

function utcDayKey(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`
}

function nextUtcMidnight(): string {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0),
  ).toISOString()
}

async function consumeQuota(
  userId: string,
  scope: "rebuild" | "inspire",
  limit: number,
): Promise<QuotaStatus> {
  const r = getRedis()
  const key = `quota:${scope}:${userId}:${utcDayKey()}`

  // Atomic increment, then set expiry only if this was the first hit. Upstash
  // doesn't ship MULTI but INCR is atomic and EXPIRE on an existing key is a
  // no-op cost-wise. Doing both unconditionally is the simplest correct path.
  const used = await r.incr(key)
  if (used === 1) {
    await r.expire(key, secondsUntilUtcMidnight())
  }

  const ok = used <= limit
  // If the consume push us OVER the limit, roll it back so subsequent reads
  // of the meter show used = limit, not limit + 1, limit + 2, ... This also
  // means a user who hits the wall gets to retry tomorrow at exactly `limit`
  // shown as their "used" total instead of an inflated number.
  if (!ok) {
    await r.decr(key)
  }

  return {
    ok,
    used: Math.min(used, limit),
    limit,
    remaining: Math.max(0, limit - Math.min(used, limit)),
    resetAt: nextUtcMidnight(),
  }
}

/** Read-only quota status — does NOT increment. For the UI meter. */
async function readQuota(
  userId: string,
  scope: "rebuild" | "inspire",
  limit: number,
): Promise<QuotaStatus> {
  const r = getRedis()
  const key = `quota:${scope}:${userId}:${utcDayKey()}`
  const raw = await r.get<number>(key)
  const used = typeof raw === "number" ? raw : 0
  return {
    ok: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetAt: nextUtcMidnight(),
  }
}

export const consumeRebuildQuota = (uid: string) => consumeQuota(uid, "rebuild", REBUILD_DAILY_LIMIT)
export const consumeInspireQuota = (uid: string) => consumeQuota(uid, "inspire", INSPIRE_DAILY_LIMIT)

export const readRebuildQuota = (uid: string) => readQuota(uid, "rebuild", REBUILD_DAILY_LIMIT)
export const readInspireQuota = (uid: string) => readQuota(uid, "inspire", INSPIRE_DAILY_LIMIT)

// ----------------------------------------------------------------------------
// IP extraction (Vercel-aware)
// ----------------------------------------------------------------------------

export function getClientIp(req: Request): string {
  const h = req.headers
  // Vercel sets x-forwarded-for as "client, proxy1, proxy2" — first entry is
  // the real client. x-real-ip is set by some self-hosted nginx setups.
  const fwd = h.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  const real = h.get("x-real-ip")
  if (real) return real.trim()
  return "unknown"
}
