import type { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"
import { SITE_URL } from "@/lib/site"
import { LIBRARIES } from "@/lib/stack-data"
import { RECIPES } from "@/lib/recipes"
import { CHANGELOG } from "@/lib/changelog"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/gallery`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/library`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/recipes`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ]

  const libraryEntries: MetadataRoute.Sitemap = LIBRARIES.map((l) => ({
    url: `${SITE_URL}/library/${l.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }))

  const recipeEntries: MetadataRoute.Sitemap = RECIPES.map((r) => ({
    url: `${SITE_URL}/recipes/${r.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }))

  const changelogEntries: MetadataRoute.Sitemap = CHANGELOG.map((c) => ({
    url: `${SITE_URL}/changelog/${c.version}`,
    lastModified: new Date(c.date),
    changeFrequency: "yearly",
    priority: 0.5,
  }))

  // Public stacks + profiles from Supabase. Best-effort — empty on failure.
  // Cookieless anon client so this route can be statically generated.
  let dynamic: MetadataRoute.Sitemap = []
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) throw new Error("Supabase env not set")
    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const [{ data: stacks }, { data: profiles }] = await Promise.all([
      supabase
        .from("stacks")
        .select("id, updated_at")
        .eq("published", true)
        .order("updated_at", { ascending: false })
        .limit(1000),
      supabase
        .from("profiles")
        .select("username, updated_at")
        .not("username", "is", null)
        .limit(1000),
    ])

    dynamic = [
      ...((stacks ?? []).map((s) => ({
        url: `${SITE_URL}/s/${s.id}`,
        lastModified: s.updated_at ? new Date(s.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })) ?? []),
      ...((profiles ?? []).map((p) => ({
        url: `${SITE_URL}/u/${p.username}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })) ?? []),
    ]
  } catch {
    // Sitemap is best-effort: a missing dynamic chunk is preferable to a failed build.
  }

  return [...staticEntries, ...libraryEntries, ...recipeEntries, ...changelogEntries, ...dynamic]
}
