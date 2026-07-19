import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

/**
 * Crawl policy for search engines and AI / generative crawlers.
 * Private app surfaces stay disallowed; marketing + about remain open for SEO / AIO / GEO.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", "/auth/", "/dashboard", "/dashboard/"]

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      // Explicit allow for major AI / answer-engine crawlers (GEO / AIO)
      { userAgent: "GPTBot", allow: "/", disallow },
      { userAgent: "ChatGPT-User", allow: "/", disallow },
      { userAgent: "Google-Extended", allow: "/", disallow },
      { userAgent: "anthropic-ai", allow: "/", disallow },
      { userAgent: "ClaudeBot", allow: "/", disallow },
      { userAgent: "Claude-Web", allow: "/", disallow },
      { userAgent: "PerplexityBot", allow: "/", disallow },
      { userAgent: "Bytespider", allow: "/", disallow },
      { userAgent: "CCBot", allow: "/", disallow },
      { userAgent: "Applebot-Extended", allow: "/", disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
