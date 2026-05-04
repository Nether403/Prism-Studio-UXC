import type { Theme } from "./themes"
import type { Library } from "./stack-data"

export type ExportInput = {
  headline: string
  rationale: string
  brief: string
  stack: Pick<Library, "id" | "name" | "category" | "tagline" | "url">[]
  reasons: Record<string, string>
  theme: Theme
  vibe: string
  audience: string
}

/* ------------------------------------------------------------------ */
/* v0 prompt                                                            */
/* ------------------------------------------------------------------ */

export function buildV0Prompt(input: ExportInput): string {
  const { headline, rationale, brief, stack, reasons, theme, vibe, audience } = input
  const stackLines = stack
    .map((s) => `- **${s.name}** (${s.category}) — ${s.tagline}${reasons[s.id] ? `\n  Why: ${reasons[s.id]}` : ""}`)
    .join("\n")

  return [
    `Build "${headline}".`,
    "",
    `Brief: ${brief}`,
    "",
    `Audience: ${audience}. Vibe: ${vibe}.`,
    "",
    `## Direction`,
    rationale,
    "",
    `## Required stack`,
    stackLines,
    "",
    `## Design system`,
    `- Theme name: ${theme.name}`,
    `- Background: ${theme.background}`,
    `- Foreground: ${theme.foreground}`,
    `- Primary: ${theme.primary}`,
    `- Accent: ${theme.accent}`,
    `- Card: ${theme.card}`,
    `- Border: ${theme.border}`,
    `- Radius: ${theme.radius}`,
    `- Display font: ${theme.displayFont}${theme.displayItalic ? " (italic)" : ""}`,
    `- Body font: ${theme.bodyFont}`,
    `- Motto: ${theme.motto}`,
    "",
    "Use the App Router. Implement at least one Hero, one Pricing, and one Form section.",
    "Apply the tokens to globals.css using @theme inline. Wire fonts via next/font.",
  ].join("\n")
}

export function openInV0(input: ExportInput) {
  const prompt = buildV0Prompt(input)
  const url = `https://v0.app/?q=${encodeURIComponent(prompt)}`
  window.open(url, "_blank", "noopener,noreferrer")
}

/* ------------------------------------------------------------------ */
/* Project starter — package.json + Next.js scaffold                    */
/* ------------------------------------------------------------------ */

const DEPENDENCY_MAP: Record<string, Record<string, string>> = {
  nextjs: { next: "^16.0.0", react: "^19.0.0", "react-dom": "^19.0.0" },
  tailwind: { tailwindcss: "^4.0.0", "@tailwindcss/postcss": "^4.0.0", postcss: "^8.4.0" },
  shadcn: { "class-variance-authority": "^0.7.0", clsx: "^2.1.0", "tailwind-merge": "^2.5.0", "lucide-react": "^0.460.0" },
  radix: { "@radix-ui/react-slot": "^1.1.0" },
  threejs: { three: "^0.170.0", "@types/three": "^0.170.0" },
  r3f: { "@react-three/fiber": "^9.0.0", three: "^0.170.0" },
  drei: { "@react-three/drei": "^9.117.0", "@react-three/fiber": "^9.0.0", three: "^0.170.0" },
  rapier: { "@react-three/rapier": "^1.5.0" },
  gsap: { gsap: "^3.12.0" },
  "framer-motion": { motion: "^12.0.0" },
  lenis: { lenis: "^1.1.0" },
  lottie: { "lottie-react": "^2.4.0" },
  tsparticles: { "@tsparticles/react": "^3.0.0", "@tsparticles/slim": "^3.0.0" },
  matter: { "matter-js": "^0.20.0" },
  ogl: { ogl: "^1.0.0" },
  "ai-sdk": { ai: "^6.0.0", "@ai-sdk/react": "^3.0.0", zod: "^3.23.0" },
}

function buildPackageJson(name: string, stackIds: string[]): string {
  const deps: Record<string, string> = {}
  // Always-on baseline
  Object.assign(deps, DEPENDENCY_MAP.nextjs, DEPENDENCY_MAP.tailwind, DEPENDENCY_MAP.shadcn)

  for (const id of stackIds) {
    const map = DEPENDENCY_MAP[id]
    if (map) Object.assign(deps, map)
  }

  return JSON.stringify(
    {
      name: name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "uxc-starter",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: Object.fromEntries(
        Object.entries(deps).sort(([a], [b]) => a.localeCompare(b))
      ),
      devDependencies: {
        "@types/node": "^22.0.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        typescript: "^5.6.0",
      },
    },
    null,
    2
  )
}

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: { "@/*": ["./*"] },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  },
  null,
  2
)

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

export default nextConfig
`

const POSTCSS_CONFIG = `export default {
  plugins: { '@tailwindcss/postcss': {} },
}
`

function buildGlobalsCss(theme: Theme): string {
  return `@import 'tailwindcss';

:root {
  --background: ${theme.background};
  --foreground: ${theme.foreground};
  --card: ${theme.card};
  --card-foreground: ${theme.foreground};
  --primary: ${theme.primary};
  --primary-foreground: ${theme.primaryForeground};
  --accent: ${theme.accent};
  --accent-foreground: ${theme.foreground};
  --muted: ${theme.muted};
  --muted-foreground: ${theme.mutedForeground};
  --border: ${theme.border};
  --radius: ${theme.radius};
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-accent: var(--accent);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --radius: var(--radius);
}

* { border-color: var(--border); }
html, body { background: var(--background); color: var(--foreground); }
body { font-family: var(--font-body), system-ui, sans-serif; }
.font-display { font-family: var(--font-display), serif;${theme.displayItalic ? " font-style: italic;" : ""} }
`
}

function buildLayoutTsx(theme: Theme): string {
  // Map theme fonts to next/font imports — fallback to Inter/Geist if not in our known set
  const known: Record<string, { import: string; var: string; sub?: string }> = {
    Inter: { import: "Inter", var: "--font-body" },
    Geist: { import: "Geist", var: "--font-body" },
    "Geist Mono": { import: "Geist_Mono", var: "--font-mono" },
    "Instrument Serif": { import: "Instrument_Serif", var: "--font-display", sub: "weight: '400'" },
    Fraunces: { import: "Fraunces", var: "--font-display" },
    "Bricolage Grotesque": { import: "Bricolage_Grotesque", var: "--font-display" },
    "Space Grotesk": { import: "Space_Grotesk", var: "--font-display" },
    "JetBrains Mono": { import: "JetBrains_Mono", var: "--font-display" },
    "Plus Jakarta Sans": { import: "Plus_Jakarta_Sans", var: "--font-body" },
    "Playfair Display": { import: "Playfair_Display", var: "--font-display" },
    "DM Serif Display": { import: "DM_Serif_Display", var: "--font-display", sub: "weight: '400'" },
    Anton: { import: "Anton", var: "--font-display", sub: "weight: '400'" },
  }

  const display = known[theme.displayFont] ?? { import: "Inter", var: "--font-display" }
  const body = known[theme.bodyFont] ?? { import: "Inter", var: "--font-body" }

  const imports = new Set<string>()
  imports.add(display.import)
  if (body.import !== display.import) imports.add(body.import)

  return `import type { Metadata } from "next"
import { ${Array.from(imports).join(", ")} } from "next/font/google"
import "./globals.css"

const displayFont = ${display.import}({ subsets: ["latin"], variable: "${display.var}"${display.sub ? ", " + display.sub : ""} })
const bodyFont = ${body.import}({ subsets: ["latin"], variable: "${body.var}"${body.sub ? ", " + body.sub : ""} })

export const metadata: Metadata = {
  title: "${theme.name}",
  description: "${theme.motto}",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={\`\${displayFont.variable} \${bodyFont.variable}\`}>{children}</body>
    </html>
  )
}
`
}

function buildPageTsx(theme: Theme, stackIds: string[], headline: string): string {
  const has = (id: string) => stackIds.includes(id)
  const imports: string[] = ['import { Button } from "./components/button"']
  const heroExtras: string[] = []
  const clientDirective = has("gsap") || has("lenis") || has("framer-motion") || has("r3f") ? '"use client"\n\n' : ""

  if (has("framer-motion")) imports.push('import { motion } from "motion/react"')
  if (has("gsap") || has("lenis")) imports.push('import { useEffect, useRef } from "react"')
  if (has("gsap")) imports.push('import gsap from "gsap"')
  if (has("lenis")) imports.push('import Lenis from "lenis"')
  if (has("r3f")) {
    imports.push('import { Canvas, useFrame } from "@react-three/fiber"')
    imports.push('import { useRef as useR } from "react"')
    imports.push('import * as THREE from "three"')
  }

  if (has("lenis") || has("gsap")) {
    heroExtras.push(`
  const headlineRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ${has("lenis") ? "const lenis = new Lenis()\n    function raf(t: number){ lenis.raf(t); requestAnimationFrame(raf) }\n    requestAnimationFrame(raf)" : ""}
    ${has("gsap") ? "if (headlineRef.current) gsap.from(headlineRef.current, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out' })" : ""}
    ${has("lenis") ? "return () => lenis.destroy()" : ""}
  }, [])
`)
  }

  const heading = has("framer-motion")
    ? `<motion.h1 ref={${has("gsap") ? "headlineRef" : "undefined"}} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="font-display text-5xl md:text-7xl tracking-tight max-w-4xl">${headline.replace(/`/g, "")}</motion.h1>`
    : `<h1 ${has("gsap") ? "ref={headlineRef} " : ""}className="font-display text-5xl md:text-7xl tracking-tight max-w-4xl">${headline.replace(/`/g, "")}</h1>`

  const r3fSnippet = has("r3f")
    ? `
function Orb() {
  const m = useR<THREE.Mesh>(null!)
  useFrame((_, dt) => { if (m.current) m.current.rotation.y += dt * 0.4 })
  return <mesh ref={m}><icosahedronGeometry args={[1.2, 1]} /><meshStandardMaterial color="${theme.primary.replace(/"/g, "'")}" /></mesh>
}

`
    : ""

  return `${clientDirective}${imports.join("\n")}

${r3fSnippet}export default function Page() {${heroExtras.join("")}
  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between px-8 py-6">
        <span className="font-display text-xl tracking-tight">${theme.name}</span>
        <nav className="flex gap-6 text-sm text-[var(--muted-foreground)]">
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section className="relative px-8 py-32 md:py-40">
        ${has("r3f") ? `<div className="absolute inset-0 -z-10 opacity-60">
          <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4] }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[3, 5, 2]} intensity={1.2} />
            <Orb />
          </Canvas>
        </div>` : ""}
        ${heading}
        <p className="mt-6 max-w-xl text-lg text-[var(--muted-foreground)]">${theme.motto.replace(/"/g, "'")}</p>
        <div className="mt-10 flex gap-3">
          <Button>Get started</Button>
          <Button variant="outline">View work</Button>
        </div>
      </section>
    </main>
  )
}
`
}

const BUTTON_TSX = `import * as React from "react"

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline"
}

export function Button({ variant = "default", className = "", ...props }: Props) {
  const base = "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] px-5 py-3 text-sm font-medium transition"
  const styles = variant === "outline"
    ? "border border-[var(--border)] bg-transparent hover:bg-[var(--muted)]"
    : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
  return <button className={\`\${base} \${styles} \${className}\`} {...props} />
}
`

function buildReadme(input: ExportInput): string {
  const stackList = input.stack.map((s) => `- ${s.name} — ${s.tagline}`).join("\n")
  return `# ${input.headline}

> ${input.rationale}

**Brief:** ${input.brief}

**Vibe:** ${input.vibe} · **Audience:** ${input.audience}

## Stack

${stackList}

## Theme — ${input.theme.name}

${input.theme.motto}

| Token | Value |
|-------|-------|
| background | \`${input.theme.background}\` |
| foreground | \`${input.theme.foreground}\` |
| primary | \`${input.theme.primary}\` |
| accent | \`${input.theme.accent}\` |
| display font | ${input.theme.displayFont} |
| body font | ${input.theme.bodyFont} |
| radius | ${input.theme.radius} |

## Run

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

Generated by [UXC](https://uxc.me).
`
}

export type StarterFiles = Record<string, string>

export function buildStarter(input: ExportInput): StarterFiles {
  const stackIds = input.stack.map((s) => s.id)
  return {
    "package.json": buildPackageJson(input.theme.name, stackIds),
    "tsconfig.json": TSCONFIG,
    "next.config.mjs": NEXT_CONFIG,
    "postcss.config.mjs": POSTCSS_CONFIG,
    "app/globals.css": buildGlobalsCss(input.theme),
    "app/layout.tsx": buildLayoutTsx(input.theme),
    "app/page.tsx": buildPageTsx(input.theme, stackIds, input.headline),
    "app/components/button.tsx": BUTTON_TSX,
    "README.md": buildReadme(input),
  }
}

/* ------------------------------------------------------------------ */
/* ZIP + StackBlitz                                                     */
/* ------------------------------------------------------------------ */

export async function downloadStarterZip(input: ExportInput): Promise<void> {
  const { default: JSZip } = await import("jszip")
  const files = buildStarter(input)
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }
  const blob = await zip.generateAsync({ type: "blob" })
  const slug = input.theme.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "uxc-starter"
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${slug}.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function openInStackBlitz(input: ExportInput): Promise<void> {
  const sdk = (await import("@stackblitz/sdk")).default
  const files = buildStarter(input)
  await sdk.openProject(
    {
      title: input.theme.name,
      description: input.headline,
      template: "node",
      files,
    },
    { newWindow: true }
  )
}
