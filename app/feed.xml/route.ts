import { CHANGELOG } from "@/lib/changelog"
import { SITE, SITE_URL } from "@/lib/site"

export const revalidate = 3600

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function entryHtml(entry: (typeof CHANGELOG)[number]) {
  const items = entry.highlights
    .map((h) => `<li><strong>${escape(h.title)}</strong> — ${escape(h.body)}</li>`)
    .join("")
  return `<p>${escape(entry.summary)}</p><ul>${items}</ul>${
    entry.note ? `<p>${escape(entry.note)}</p>` : ""
  }`
}

export function GET() {
  const items = CHANGELOG.map((entry) => {
    const url = `${SITE_URL}/changelog/${entry.version}`
    return `
    <item>
      <title>${escape(`${entry.version} — ${entry.title}`)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
      <description>${escape(entry.summary)}</description>
      <content:encoded><![CDATA[${entryHtml(entry)}]]></content:encoded>
    </item>`
  }).join("")

  const lastBuild = new Date(CHANGELOG[0]?.date ?? Date.now()).toUTCString()

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(`${SITE.name} Changelog`)}</title>
    <link>${SITE_URL}/changelog</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escape(`What shipped to ${SITE.name}, version by version.`)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=600, stale-while-revalidate=3600",
    },
  })
}
