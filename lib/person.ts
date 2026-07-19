/**
 * Canonical founder / person entity for UXC.
 * Single source of truth for the about page, JSON-LD, and AI-facing surfaces (llms.txt).
 */
import { SITE_URL } from "@/lib/site"

export const PERSON = {
  /** Preferred display / legal branding form */
  name: "Martin vanDeursen",
  /** Spaced Dutch surname form — keep both for search & entity matching */
  alternateNames: ["Martin van Deursen"] as const,
  givenName: "Martin",
  familyName: "vanDeursen",
  jobTitle: "Designer / Builder",
  description:
    "Independent designer and builder behind The Witness Protocol and Realm101. Founder of UXC — based in Amsterdam, Netherlands.",
  location: {
    locality: "Amsterdam",
    countryCode: "NL",
    countryName: "Netherlands",
  },
  organizations: {
    studio: "Realm101",
    brand: "The Witness Protocol",
    product: "UXC",
  },
  emails: [
    {
      address: "martin@dutchdatalabs.online",
      label: "Dutch Data Labs",
      note: "Primary — project briefs & collaboration",
      primary: true,
    },
    {
      address: "martin@101dev.xyz",
      label: "101dev",
      note: "Dev & engineering",
      primary: false,
    },
    {
      address: "founder@twpf.online",
      label: "TWPF",
      note: "The Witness Protocol",
      primary: false,
    },
  ] as const,
  profiles: [
    {
      label: "LinkedIn",
      handle: "in/mvd101",
      url: "https://www.linkedin.com/in/mvd101/",
    },
    {
      label: "GitHub",
      handle: "Nether403",
      url: "https://github.com/Nether403/",
    },
    {
      label: "F6S",
      handle: "martin-deursen1",
      url: "https://www.f6s.com/martin-deursen1",
    },
  ] as const,
  projects: [
    {
      name: "Nether101",
      url: "https://Nether101.nl",
      domain: "nether101.nl",
      blurb: "The lab — experiments, motion studies, and the ongoing search for the right line.",
    },
    {
      name: "Alignment Saga",
      url: "https://alignmentsaga.nl",
      domain: "alignmentsaga.nl",
      blurb: "A long-form narrative project about systems, tension, and the alignment problem.",
    },
    {
      name: "Processo Ergo Sum",
      url: "https://Processoergosum.info",
      domain: "processoergosum.info",
      blurb: "Process essays — thinking aloud about craft, pattern, and what survives iteration.",
    },
    {
      name: "Witness Protocol",
      url: "https://Witnessprotocol.online",
      domain: "witnessprotocol.online",
      blurb: "The umbrella — the studio brand under which the rest of the work assembles.",
    },
  ] as const,
} as const

export const PERSON_ID = `${SITE_URL}/about#person`

export function personPrimaryEmail(): string {
  return PERSON.emails.find((e) => e.primary)?.address ?? PERSON.emails[0].address
}

/** All identity URLs for schema.org sameAs (profiles + owned properties). */
export function personSameAs(): string[] {
  return [
    ...PERSON.profiles.map((p) => p.url),
    ...PERSON.projects.map((p) => p.url),
  ]
}

/** Schema.org Person graph node — reusable across pages and llms surfaces. */
export function personJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: PERSON.name,
    alternateName: [...PERSON.alternateNames],
    givenName: PERSON.givenName,
    familyName: PERSON.familyName,
    jobTitle: PERSON.jobTitle,
    description: PERSON.description,
    url: `${SITE_URL}/about`,
    email: PERSON.emails.map((e) => `mailto:${e.address}`),
    image: `${SITE_URL}/logoUXC.png`,
    address: {
      "@type": "PostalAddress",
      addressLocality: PERSON.location.locality,
      addressCountry: PERSON.location.countryCode,
    },
    nationality: {
      "@type": "Country",
      name: PERSON.location.countryName,
    },
    worksFor: {
      "@type": "Organization",
      name: PERSON.organizations.studio,
      brand: PERSON.organizations.brand,
      url: "https://Witnessprotocol.online",
    },
    // Person → orgs they founded (Organization uses `founder` the other way)
    founderOf: [
      {
        "@type": "Organization",
        name: PERSON.organizations.product,
        url: SITE_URL,
      },
      {
        "@type": "Organization",
        name: PERSON.organizations.brand,
        url: "https://Witnessprotocol.online",
      },
    ],
    sameAs: personSameAs(),
    knowsAbout: [
      "UX design",
      "Creative coding",
      "WebGL",
      "Design systems",
      "AI-assisted design tools",
      "Three.js",
      "Next.js",
    ],
  }
}
