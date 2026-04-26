import Link from "next/link"
import { ArrowUpRight, ImageIcon, Link2, Sparkles } from "lucide-react"

/**
 * Three-card discovery band that surfaces every way to start a stack.
 *
 * Sits above the Generator on the homepage. The Generator itself is the
 * "Describe" path and stays anchored at #generator — this card just makes
 * the new flows (`/from-image`, `/rebuild`) visible to anyone who lands
 * on the marketing page expecting a single textbox.
 *
 * Server component on purpose: no interactivity, no client state.
 */

const PATHS = [
  {
    href: "#generator",
    icon: Sparkles,
    eyebrow: "01",
    title: "Describe it",
    blurb:
      "Write a brief in plain English. Prism builds a stack, theme, and rationale tuned to your vibe.",
    cta: "Open the generator",
    isLocal: true,
  },
  {
    href: "/from-image",
    icon: ImageIcon,
    eyebrow: "02",
    title: "From an image",
    blurb:
      "Drop a screenshot, paste from clipboard, or share a Mobbin / Dribbble URL. Prism reads the vibe.",
    cta: "Upload an image",
  },
  {
    href: "/rebuild",
    icon: Link2,
    eyebrow: "03",
    title: "From any URL",
    blurb:
      "Paste a live site. Prism captures it, extracts the signature, and produces three reinterpretations.",
    cta: "Rebuild a site",
    badge: "New",
  },
] as const

export function IngressPicker() {
  return (
    <section
      id="start"
      aria-labelledby="ingress-heading"
      className="relative mx-auto max-w-7xl px-6 py-16 md:py-24"
    >
      <header className="mb-10 flex flex-col gap-3 md:mb-14 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Three doors, same room
          </p>
          <h2
            id="ingress-heading"
            className="mt-3 font-display text-balance text-4xl leading-[1.05] md:text-5xl"
          >
            Pick your <em className="italic text-primary">starting point</em>.
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
          However you arrive, you land in the same place — a tuned stack,
          a custom theme, three variants, and an &ldquo;Open in v0&rdquo;
          handoff when you&apos;re ready to build.
        </p>
      </header>

      <ul className="grid gap-4 md:grid-cols-3">
        {PATHS.map((p) => {
          const Icon = p.icon
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                data-cursor="hover"
                className="group relative flex h-full flex-col gap-6 rounded-2xl border border-border bg-card/40 p-6 backdrop-blur transition hover:border-primary/60 hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {p.eyebrow}
                  </span>
                  <span className="flex items-center gap-2">
                    {"badge" in p && p.badge ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary-foreground">
                        {p.badge}
                      </span>
                    ) : null}
                    <Icon className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <h3 className="font-display text-2xl leading-tight">
                    {p.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    {p.blurb}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
                  <span>{p.cta}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
