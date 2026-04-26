import Link from "next/link"
import type { ReactNode } from "react"
import { UxcWordmark } from "@/components/uxc-wordmark"

export function AuthShell({
  index,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  index: string
  eyebrow: string
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="relative min-h-svh bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_8%,transparent)_0%,transparent_60%)]" />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="inline-flex items-center" data-cursor="hover">
          <UxcWordmark variant="lockup" />
        </Link>
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition"
          data-cursor="hover"
        >
          ← Back to UXC
        </Link>
      </header>

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 pb-24 pt-12 md:grid-cols-12 md:pt-20">
        {/* Left rail — index + headline */}
        <aside className="md:col-span-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {index} · {eyebrow}
          </div>
          <h1 className="mt-6 font-display text-5xl leading-[0.9] tracking-tight md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-md text-pretty text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
          <div className="mt-10 hidden md:block">
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {["primary", "accent", "card", "border"].map((token, i) => (
                <div
                  key={token}
                  className="flex h-12 items-end justify-between rounded-md border border-border p-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground"
                  style={{
                    background:
                      token === "primary"
                        ? "var(--primary)"
                        : token === "accent"
                          ? "var(--accent)"
                          : token === "card"
                            ? "var(--card)"
                            : "transparent",
                    color:
                      token === "primary"
                        ? "var(--primary-foreground)"
                        : token === "accent"
                          ? "var(--accent-foreground)"
                          : "var(--muted-foreground)",
                  }}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span>{token}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right — form card */}
        <section className="md:col-span-7">
          <div className="rounded-xl border border-border bg-card/40 p-6 backdrop-blur-sm md:p-10">
            {children}
            {footer && (
              <div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
                {footer}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
