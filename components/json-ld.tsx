/**
 * Server-rendered JSON-LD injector. Use this for structured data
 * (WebSite, SoftwareApplication, Article, BreadcrumbList, Person, etc.).
 *
 * Pass either a single object or an array of objects — they'll all be
 * serialized into separate <script type="application/ld+json"> tags so
 * they remain individually parseable by crawlers.
 */
type LdValue = Record<string, unknown>

export function JsonLd({ data }: { data: LdValue | LdValue[] }) {
  const entries = Array.isArray(data) ? data : [data]
  return (
    <>
      {entries.map((d, i) => (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
          // Keys are stable per-page since the array is built deterministically.
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          type="application/ld+json"
        />
      ))}
    </>
  )
}

/** Convenience builder for BreadcrumbList. Pass crumbs in order, root first. */
export function breadcrumbList(
  baseUrl: string,
  crumbs: { name: string; path: string }[],
): LdValue {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.path.startsWith("http") ? c.path : `${baseUrl}${c.path}`,
    })),
  }
}
