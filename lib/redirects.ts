/** Safe redirect helpers shared by auth routes and client login code. */

export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback

  let decoded = value.trim()
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    // Keep the original value if it was not URI-encoded.
  }

  // Only same-origin relative paths are allowed. Block protocol-relative URLs,
  // absolute URLs, control characters, and backslash variants that browsers may
  // normalize into external navigations.
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback
  if (decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded)) return fallback

  return decoded
}