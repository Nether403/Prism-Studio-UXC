import { Sparkles } from "lucide-react"

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-6">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <span className="font-mono text-sm tracking-tight">PRISM/STUDIO</span>
            </div>
            <p className="mt-6 max-w-md font-display text-3xl md:text-4xl tracking-[-0.02em] leading-[1.05] text-balance">
              Brief in. <em className="italic text-primary">Stack out.</em>
              <br />
              Ship a site that looks like nothing else.
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Studio
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="/#generator" className="hover:text-primary transition">
                  Generator
                </a>
              </li>
              <li>
                <a href="/recipes" className="hover:text-primary transition">
                  Recipes
                </a>
              </li>
              <li>
                <a href="/gallery" className="hover:text-primary transition">
                  Gallery
                </a>
              </li>
              <li>
                <a href="/library" className="hover:text-primary transition">
                  Library
                </a>
              </li>
              <li>
                <a href="/about" className="hover:text-primary transition">
                  About
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Build with
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="https://nextjs.org" target="_blank" rel="noreferrer" className="hover:text-primary transition">
                  Next.js
                </a>
              </li>
              <li>
                <a href="https://threejs.org" target="_blank" rel="noreferrer" className="hover:text-primary transition">
                  Three.js
                </a>
              </li>
              <li>
                <a href="https://gsap.com" target="_blank" rel="noreferrer" className="hover:text-primary transition">
                  GSAP
                </a>
              </li>
              <li>
                <a href="https://lenis.darkroom.engineering" target="_blank" rel="noreferrer" className="hover:text-primary transition">
                  Lenis
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Account
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="/auth/login" className="hover:text-primary transition">
                  Sign in
                </a>
              </li>
              <li>
                <a href="/auth/sign-up" className="hover:text-primary transition">
                  Sign up
                </a>
              </li>
              <li>
                <a href="/dashboard" className="hover:text-primary transition">
                  My stacks
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            © {new Date().getFullYear()} Prism Studio · A v0 demo
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Crafted with WebGL, GSAP, Lenis, Shadcn, Tailwind, Next.js
          </p>
        </div>
      </div>

      {/* Giant wordmark */}
      <div className="overflow-hidden border-t border-border">
        <div className="mx-auto max-w-[100rem] px-6 py-12">
          <div
            aria-hidden
            className="font-display tracking-[-0.06em] leading-[0.85] text-[clamp(5rem,18vw,18rem)] text-foreground/[0.05] select-none"
          >
            PRISM
          </div>
        </div>
      </div>
    </footer>
  )
}
