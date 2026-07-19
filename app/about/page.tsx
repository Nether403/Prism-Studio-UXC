import type { Metadata } from "next"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { JsonLd, breadcrumbList } from "@/components/json-ld"
import { SITE_URL, SITE } from "@/lib/site"
import {
  PERSON,
  PERSON_ID,
  personJsonLd,
  personPrimaryEmail,
} from "@/lib/person"
import { ArrowUpRight, Mail, Github, Linkedin, MapPin, ExternalLink } from "lucide-react"

const primaryEmail = personPrimaryEmail()

export const metadata: Metadata = {
  title: `About — ${PERSON.name}`,
  description: PERSON.description,
  keywords: [
    PERSON.name,
    ...PERSON.alternateNames,
    "Realm101",
    "The Witness Protocol",
    "UXC",
    "Amsterdam designer",
    "Dutch Data Labs",
    "101dev",
    "TWPF",
    "creative coding",
    "UX curator",
  ],
  authors: [{ name: PERSON.name, url: `${SITE_URL}/about` }],
  creator: PERSON.name,
  publisher: SITE.name,
  alternates: { canonical: "/about" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    title: `About — ${PERSON.name}`,
    description: PERSON.description,
    type: "profile",
    url: "/about",
    siteName: SITE.name,
    locale: SITE.locale,
    firstName: PERSON.givenName,
    lastName: PERSON.familyName,
    username: "Nether403",
    images: [{ url: "/logoUXC.png", width: 750, height: 480, alt: PERSON.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `About — ${PERSON.name}`,
    description: PERSON.description,
    images: ["/logoUXC.png"],
  },
}

const SOCIAL_ICONS = {
  LinkedIn: Linkedin,
  GitHub: Github,
  F6S: ExternalLink,
} as const

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <JsonLd
        data={[
          breadcrumbList(SITE_URL, [
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "@id": `${SITE_URL}/about#webpage`,
            name: `About — ${PERSON.name}`,
            description: PERSON.description,
            url: `${SITE_URL}/about`,
            isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE_URL },
            about: { "@id": PERSON_ID },
            mainEntity: { "@id": PERSON_ID },
            inLanguage: "en",
          },
          personJsonLd(),
        ]}
      />
      <CommandPalette />
      <Nav />

      {/* Hero */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                About · 01
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                    Available for work
                  </span>
                </div>
                {/* Alternate spelling tag — aids search/entity matching for "Martin van Deursen" */}
                {PERSON.alternateNames.map((aka) => (
                  <div
                    key={aka}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      also
                    </span>
                    <span className="font-mono text-[10px] tracking-wider text-foreground">{aka}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-9">
              <h1 className="text-balance font-display font-light text-5xl md:text-7xl leading-[0.95] tracking-tight">
                Martin <em className="font-display italic text-primary">vanDeursen</em>.
                <br />
                Designer who ships.
              </h1>
              <p className="sr-only">Also known as {PERSON.alternateNames.join(", ")}.</p>
              <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground leading-relaxed">
                Independent operator behind <span className="text-foreground">Realm101</span> and{" "}
                <span className="text-foreground">The Witness Protocol</span> — a small studio
                making opinionated tools, narrative work, and the occasional generator. UXC is
                one of those.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Identity card */}
      <section className="relative pb-20">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
            <Cell label="Studio">
              <div className="font-display text-2xl tracking-tight">{PERSON.organizations.studio}</div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {PERSON.organizations.brand}
              </p>
            </Cell>
            <Cell label="Based in">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" aria-hidden />
                <span className="font-display text-2xl tracking-tight">{PERSON.location.locality}</span>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {PERSON.location.countryName}
              </p>
            </Cell>
            <Cell label="Direct">
              <ul className="space-y-3">
                {PERSON.emails.map((e) => (
                  <li key={e.address}>
                    <a
                      href={`mailto:${e.address}`}
                      data-cursor="hover"
                      className="group inline-flex items-center gap-2 font-display text-lg md:text-xl tracking-tight underline-offset-4 hover:underline break-all"
                    >
                      {e.address}
                      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                    </a>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {e.label}
                      {e.primary ? " · primary" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Cell>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="relative pb-20">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-12 mb-10">
            <div className="md:col-span-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Index · 02
              </div>
              <h2 className="mt-3 font-display text-3xl md:text-4xl leading-tight tracking-tight">
                Other <em className="italic text-primary">work.</em>
              </h2>
            </div>
            <p className="md:col-span-9 max-w-2xl text-pretty text-base text-muted-foreground leading-relaxed">
              Each of these is a different angle on the same practice — making things that try to
              earn their existence. Some are public, some are slow, all are mine.
            </p>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-2">
            {PERSON.projects.map((p, i) => (
              <a
                key={p.url}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer me"
                data-cursor="hover"
                className="group relative bg-background p-8 md:p-10 transition hover:bg-card/40"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")} · {p.domain}
                    </div>
                    <h3 className="mt-3 font-display text-3xl md:text-4xl leading-tight tracking-tight">
                      {p.name}
                    </h3>
                    <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
                      {p.blurb}
                    </p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Social */}
      <section className="relative pb-32">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-12 mb-10">
            <div className="md:col-span-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Index · 03
              </div>
              <h2 className="mt-3 font-display text-3xl md:text-4xl leading-tight tracking-tight">
                Elsewhere.
              </h2>
            </div>
            <p className="md:col-span-9 max-w-2xl text-pretty text-base text-muted-foreground leading-relaxed">
              LinkedIn for the formal, GitHub for the actual, F6S for the founder trail.
            </p>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-3">
            {PERSON.profiles.map((s) => {
              const Icon = SOCIAL_ICONS[s.label as keyof typeof SOCIAL_ICONS] ?? ExternalLink
              return (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer me"
                  data-cursor="hover"
                  className="group relative flex items-center justify-between gap-6 bg-background p-8 md:p-10 transition hover:bg-card/40"
                >
                  <div className="flex items-center gap-5">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-border bg-card transition group-hover:border-primary/40 group-hover:text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                        {s.label}
                      </div>
                      <div className="mt-1 font-display text-2xl tracking-tight">{s.handle}</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              )
            })}
          </div>

          <div className="mt-16 flex flex-col gap-4 border-t border-border pt-8 md:flex-row md:items-center md:justify-between">
            <p className="max-w-xl text-pretty text-sm text-muted-foreground leading-relaxed">
              Have a brief? Want to talk about a build, a bug in UXC, or something stranger? Drop
              a note — I read everything.
            </p>
            <a
              href={`mailto:${primaryEmail}`}
              data-cursor="hover"
              className="inline-flex items-center gap-2 self-start rounded-md bg-primary px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground transition hover:opacity-90 md:self-auto"
            >
              Start a conversation
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-background p-8 md:p-10">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}
