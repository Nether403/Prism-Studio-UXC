import type { Metadata } from "next"
import Link from "next/link"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { CommandPalette } from "@/components/command-palette"
import { JsonLd } from "@/components/json-ld"
import { SITE_URL } from "@/lib/site"
import { ArrowUpRight, Mail, Github, Linkedin, MapPin } from "lucide-react"

export const metadata: Metadata = {
  title: "About — Martin vanDeursen",
  description:
    "Martin vanDeursen — independent designer/builder behind The Witness Protocol and Realm101. Based in Amsterdam, Netherlands.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About — Martin vanDeursen",
    description:
      "The person behind UXC, The Witness Protocol, and Realm101. Amsterdam, Netherlands.",
    type: "profile",
    url: "/about",
  },
}

const PROJECTS: Array<{
  name: string
  url: string
  domain: string
  blurb: string
}> = [
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
]

const SOCIAL: Array<{
  label: string
  handle: string
  url: string
  icon: typeof Github
}> = [
  {
    label: "LinkedIn",
    handle: "in/mvd101",
    url: "https://www.linkedin.com/in/mvd101/",
    icon: Linkedin,
  },
  {
    label: "GitHub",
    handle: "Nether403",
    url: "https://github.com/Nether403",
    icon: Github,
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "About", item: `${SITE_URL}/about` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Martin vanDeursen",
            jobTitle: "Designer / Builder",
            worksFor: {
              "@type": "Organization",
              name: "Realm101",
              brand: "The Witness Protocol",
            },
            address: {
              "@type": "PostalAddress",
              addressLocality: "Amsterdam",
              addressCountry: "NL",
            },
            email: "mailto:martin@realm101.com",
            url: `${SITE_URL}/about`,
            sameAs: [
              "https://www.linkedin.com/in/mvd101/",
              "https://github.com/Nether403",
              "https://Nether101.nl",
              "https://alignmentsaga.nl",
              "https://Processoergosum.info",
              "https://Witnessprotocol.online",
            ],
          },
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
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                  Available for work
                </span>
              </div>
            </div>
            <div className="md:col-span-9">
              <h1 className="text-balance font-display font-light text-5xl md:text-7xl leading-[0.95] tracking-tight">
                Martin <em className="font-display italic text-primary">vanDeursen</em>.
                <br />
                Designer who ships.
              </h1>
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
              <div className="font-display text-2xl tracking-tight">Realm101</div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                The Witness Protocol
              </p>
            </Cell>
            <Cell label="Based in">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-display text-2xl tracking-tight">Amsterdam</span>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Netherlands
              </p>
            </Cell>
            <Cell label="Direct">
              <a
                href="mailto:martin@realm101.com"
                data-cursor="hover"
                className="group inline-flex items-center gap-2 font-display text-2xl tracking-tight underline-offset-4 hover:underline"
              >
                martin@realm101.com
                <Mail className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
              </a>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Best for project briefs &amp; collaboration
              </p>
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
            {PROJECTS.map((p, i) => (
              <a
                key={p.url}
                href={p.url}
                target="_blank"
                rel="noreferrer"
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
              Two channels, two registers. LinkedIn for the formal, GitHub for the actual.
            </p>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-2">
            {SOCIAL.map((s) => {
              const Icon = s.icon
              return (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="hover"
                  className="group relative flex items-center justify-between gap-6 bg-background p-8 md:p-10 transition hover:bg-card/40"
                >
                  <div className="flex items-center gap-5">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-border bg-card transition group-hover:border-primary/40 group-hover:text-primary">
                      <Icon className="h-5 w-5" />
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
            <Link
              href="mailto:martin@realm101.com"
              data-cursor="hover"
              className="inline-flex items-center gap-2 self-start rounded-md bg-primary px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground transition hover:opacity-90 md:self-auto"
            >
              Start a conversation
              <ArrowUpRight className="h-4 w-4" />
            </Link>
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
