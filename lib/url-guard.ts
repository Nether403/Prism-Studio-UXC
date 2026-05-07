/**
 * SSRF + abuse guard for the live-rebuild flow.
 *
 * Layers, in order of evaluation:
 *  1. URL parse + scheme allowlist (http / https only).
 *  2. Hostname-form rejection (literal IPs, .local, etc).
 *  3. DNS resolution → check every resolved IP against private ranges.
 *  4. Domain block list (trademark traps + abuse vectors).
 *  5. robots.txt check (best-effort; a missing or 404 robots.txt = allow).
 *
 * Each layer is independently fail-closed. If anything throws or times out,
 * we treat the URL as denied — the cost of a false reject is lower than the
 * cost of a private-IP fetch leak.
 */

import { promises as dns } from "node:dns"

// ----------------------------------------------------------------------------
// Domain block list
// ----------------------------------------------------------------------------
//
// Conservative starting list. Editable without a deploy via env var
// REBUILD_BLOCKED_DOMAINS (comma-separated). We DO NOT block "common famous
// brands" — the legal mitigation for that is the watermark + private-by-default
// rule on /rebuild/[id], not a manual blocklist of every Fortune 500.

const HARDCODED_BLOCKED = new Set([
  // Anti-abuse
  "localhost",
  "metadata.google.internal",
  "169.254.169.254", // AWS/GCP metadata
  // Internal Vercel infra
  "vercel.com", // own dogfood handled elsewhere
])

function getEnvBlocklist(): Set<string> {
  const raw = process.env.REBUILD_BLOCKED_DOMAINS
  if (!raw) return new Set()
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  )
}

// ----------------------------------------------------------------------------
// Private IP ranges (IPv4 + IPv6)
// ----------------------------------------------------------------------------

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true
  const [a, b] = parts
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) || // link-local incl. cloud metadata
    (a === 172 && b! >= 16 && b! <= 31) ||
    (a === 192 && b === 168) ||
    a === 100 || // CGNAT 100.64.0.0/10 (we drop the whole /8 to be safe)
    a >= 224 // multicast / reserved
  )
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower.includes("%")) return true
  if (lower === "::" || lower === "::1") return true
  if (lower.startsWith("0:")) return true
  if (lower.startsWith("fe80:")) return true // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true // unique-local fc00::/7
  if (lower.startsWith("ff")) return true // multicast
  // IPv4-mapped IPv6: ::ffff:x.x.x.x — extract the v4 and check
  const v4mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4mapped) return isPrivateIPv4(v4mapped[1]!)
  return false
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export type UrlValidationResult =
  | { ok: true; url: URL; hostname: string; resolvedIps: string[] }
  | { ok: false; reason: string; code: ValidationCode }

export type ValidationCode =
  | "invalid_url"
  | "bad_scheme"
  | "blocked_domain"
  | "private_address"
  | "dns_failure"
  | "literal_ip"
  | "robots_disallowed"

/**
 * Validate a user-submitted URL all the way through DNS.
 * Caller should still call `checkRobots()` separately because robots.txt has
 * its own latency budget worth surfacing as a distinct stage.
 */
export async function validateRebuildUrl(input: string): Promise<UrlValidationResult> {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return { ok: false, reason: "Could not parse URL.", code: "invalid_url" }
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http(s) URLs are allowed.", code: "bad_scheme" }
  }

  const hostname = url.hostname.toLowerCase()
  if (!hostname || hostname === "") {
    return { ok: false, reason: "URL has no host.", code: "invalid_url" }
  }

  // Reject literal IPs in the hostname — we want users pasting domain names,
  // not raw addresses. Anyone trying to bypass DNS-based filtering loses here.
  const looksLikeIPv4 = /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  const looksLikeIPv6 = hostname.includes(":")
  if (looksLikeIPv4 || looksLikeIPv6) {
    return { ok: false, reason: "Literal IP addresses are not allowed.", code: "literal_ip" }
  }

  // .local / .internal / .arpa — never legitimate user-facing
  if (hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".arpa")) {
    return { ok: false, reason: "Private TLD not allowed.", code: "blocked_domain" }
  }

  // Block list
  const blocklist = new Set([...HARDCODED_BLOCKED, ...getEnvBlocklist()])
  for (const blocked of blocklist) {
    if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
      return { ok: false, reason: "This domain is not supported.", code: "blocked_domain" }
    }
  }

  // DNS resolve and check every result. Both A and AAAA — caller may follow
  // either. node:dns honors process timeouts; we wrap in our own race anyway.
  const RESOLVE_TIMEOUT_MS = 3000
  const resolveAll = async () => {
    const v4 = dns.resolve4(hostname).catch(() => [] as string[])
    const v6 = dns.resolve6(hostname).catch(() => [] as string[])
    const [a, b] = await Promise.all([v4, v6])
    return [...a, ...b]
  }
  const timeout = new Promise<string[]>((_, reject) =>
    setTimeout(() => reject(new Error("dns_timeout")), RESOLVE_TIMEOUT_MS),
  )

  let resolved: string[]
  try {
    resolved = await Promise.race([resolveAll(), timeout])
  } catch {
    return { ok: false, reason: "DNS lookup failed or timed out.", code: "dns_failure" }
  }

  if (resolved.length === 0) {
    return { ok: false, reason: "Domain has no DNS records.", code: "dns_failure" }
  }

  for (const ip of resolved) {
    const isV4 = ip.includes(".")
    const isPrivate = isV4 ? isPrivateIPv4(ip) : isPrivateIPv6(ip)
    if (isPrivate) {
      return {
        ok: false,
        reason: "Domain resolves to a private/internal address.",
        code: "private_address",
      }
    }
  }

  return { ok: true, url, hostname, resolvedIps: resolved }
}

/** Validate any URL immediately before server-side fetching it. */
export async function validatePublicFetchUrl(input: string): Promise<UrlValidationResult> {
  return validateRebuildUrl(input)
}

// ----------------------------------------------------------------------------
// robots.txt
// ----------------------------------------------------------------------------

/**
 * Best-effort robots.txt check. Conservative-allow:
 *  - 4xx / 5xx / network failure / timeout → allow (treat as "no robots.txt").
 *  - Parse: only the User-agent: * group. Any matching `Disallow:` prefix on
 *    the path (or a blanket `Disallow: /`) results in disallow.
 *  - Allow rules override Disallow when more specific (longest match wins).
 *
 * This is deliberately not a full RFC implementation — we want to respect
 * obvious "go away" signals without becoming unusably strict.
 */
export async function checkRobots(url: URL): Promise<{ allowed: boolean; reason?: string }> {
  const robotsUrl = `${url.protocol}//${url.host}/robots.txt`
  const ROBOTS_TIMEOUT_MS = 2500

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ROBOTS_TIMEOUT_MS)

  let body: string
  try {
    const res = await fetch(robotsUrl, {
      signal: ctrl.signal,
      headers: { "user-agent": "UXC-Bot/1.0 (+https://uxc.me; site-rebuild)" },
      redirect: "manual", // robots.txt redirects are usually noise
    })
    if (res.status >= 300 && res.status < 400) {
      return { allowed: false, reason: "robots.txt redirected; automated access is disabled for safety." }
    }
    if (!res.ok) {
      // Most 4xx / 5xx — no robots.txt published. Allow.
      return { allowed: true }
    }
    body = (await res.text()).slice(0, 64 * 1024) // hard cap on absurd robots.txt
  } catch {
    return { allowed: true }
  } finally {
    clearTimeout(timer)
  }

  // Minimal parser: collect rules under each User-agent group, then evaluate
  // the most specific match for "*". We don't try to be clever about
  // user-agent precedence because we identify as UXC-Bot and the public
  // contract is that we honor "*" only.
  const lines = body.split(/\r?\n/)
  const starRules: Array<{ kind: "allow" | "disallow"; pattern: string }> = []
  let inStarGroup = false
  let inAnyGroup = false

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0]!.trim()
    if (!line) continue
    const colon = line.indexOf(":")
    if (colon < 0) continue
    const directive = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()

    if (directive === "user-agent") {
      inAnyGroup = true
      inStarGroup = value === "*"
      continue
    }
    if (!inAnyGroup) continue
    if (!inStarGroup) continue

    if (directive === "allow" || directive === "disallow") {
      starRules.push({ kind: directive, pattern: value })
    }
  }

  if (starRules.length === 0) return { allowed: true }

  const path = url.pathname || "/"
  // Find the longest matching pattern. Allow wins ties.
  let bestMatch: { kind: "allow" | "disallow"; len: number } | null = null
  for (const rule of starRules) {
    if (rule.pattern === "") {
      // `Disallow:` with empty value = allow everything per spec.
      if (rule.kind === "disallow") continue
    }
    if (path.startsWith(rule.pattern)) {
      const len = rule.pattern.length
      if (
        !bestMatch ||
        len > bestMatch.len ||
        (len === bestMatch.len && rule.kind === "allow")
      ) {
        bestMatch = { kind: rule.kind, len }
      }
    }
  }

  if (bestMatch && bestMatch.kind === "disallow") {
    return { allowed: false, reason: "robots.txt disallows automated access to this path." }
  }
  return { allowed: true }
}
