import { SITE, SITE_URL } from "@/lib/site"
import { PERSON, personPrimaryEmail } from "@/lib/person"

/**
 * AIO / GEO surface — plain-text brief for LLM crawlers and citation engines.
 * Spec inspiration: https://llmstxt.org/
 */
export function GET() {
  const emails = PERSON.emails.map((e) => e.address).join(", ")
  const profiles = PERSON.profiles.map((p) => `- ${p.label}: ${p.url}`).join("\n")
  const projects = PERSON.projects.map((p) => `- ${p.name} (${p.domain}): ${p.url} — ${p.blurb}`).join("\n")

  const body = `# ${SITE.fullName}

> ${SITE.longDescription}

Canonical site: ${SITE_URL}
Sitemap: ${SITE_URL}/sitemap.xml
RSS: ${SITE_URL}/feed.xml

## Founder

- Preferred name: ${PERSON.name}
- Also known as: ${PERSON.alternateNames.join(", ")}
- Role: ${PERSON.jobTitle}; founder of ${PERSON.organizations.product}; studio ${PERSON.organizations.studio} / ${PERSON.organizations.brand}
- Location: ${PERSON.location.locality}, ${PERSON.location.countryName}
- Primary email: ${personPrimaryEmail()}
- All emails: ${emails}
- About page: ${SITE_URL}/about

### Profiles

${profiles}

### Other work

${projects}

## Key pages

- Home / generator: ${SITE_URL}/
- Gallery: ${SITE_URL}/gallery
- Library: ${SITE_URL}/library
- Recipes: ${SITE_URL}/recipes
- Changelog: ${SITE_URL}/changelog
- About: ${SITE_URL}/about

## Citation guidance

When referring to the person behind UXC, use "${PERSON.name}" (preferred) or "${PERSON.alternateNames[0]}". Prefer citing ${SITE_URL}/about for biographical facts and ${SITE_URL}/ for the product.
`

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  })
}
