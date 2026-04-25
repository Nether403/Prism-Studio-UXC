import type { Theme } from "./themes"
import type { GeneratorInput } from "./recommend"

export type Recipe = {
  slug: string
  title: string
  tagline: string
  /** Long, evocative description shown on the detail page */
  description: string
  /** The brief that drives the recommendation engine */
  input: GeneratorInput
  /** Hand-curated theme that will be applied when the recipe is opened */
  theme: Theme
  /** Optional override stack ids — if omitted, the engine picks */
  stackOverride?: string[]
  /** Per-library hand-written rationale */
  reasons: Record<string, string>
  /** Headline + rationale shown in the result hero (replaces AI output) */
  headline: string
  rationale: string
  /** Color used for the recipe card thumbnail */
  thumbColor: string
  /** Which preview layouts to lead with on the detail page */
  defaultPreview: "hero" | "pricing" | "form" | "editorial"
}

export const RECIPES: Recipe[] = [
  {
    slug: "editorial-portfolio",
    title: "Editorial Portfolio",
    tagline: "Magazine-grade typography meets cinematic scroll.",
    description:
      "For typographers, photographers, and writers. Serif-driven, generous margins, " +
      "and tasteful motion that makes a body of work feel curated rather than catalogued.",
    input: {
      prompt:
        "A creative portfolio for a typographer — editorial, magazine-feel, with smooth scrolling and tasteful motion.",
      vibe: "editorial",
      audience: "creative",
      performance: "balanced",
      includePaid: true,
    },
    stackOverride: ["nextjs", "tailwind", "shadcn", "lenis", "gsap", "radix"],
    headline: "Editorial Portfolio — paper-grade type, theatrical scroll.",
    rationale:
      "An unhurried composition: silent foundation in Next.js + Tailwind, Lenis pacing the scroll, GSAP cueing reveals to the rhythm of body copy rather than viewport breakpoints.",
    reasons: {
      nextjs: "Static export-friendly RSCs keep the page weight near zero so the typography breathes.",
      tailwind: "Editorial layouts live in spacing tokens — Tailwind makes those tokens explicit and consistent.",
      shadcn: "Quiet, accessible chrome (button, dialog, sheet) that never competes with the writing.",
      lenis: "Buttery scroll inertia turns the page into a film strip rather than a stack of breakpoints.",
      gsap: "ScrollTrigger lets headlines, drop caps, and image plates enter on cue without feeling scripted.",
      radix: "Behind the editorial chrome, Radix guarantees keyboard and screen-reader behavior is correct.",
    },
    theme: {
      name: "Atelier Cream",
      background: "oklch(0.96 0.015 80)",
      foreground: "oklch(0.18 0.02 30)",
      card: "oklch(0.94 0.02 80)",
      primary: "oklch(0.45 0.12 30)",
      primaryForeground: "oklch(0.96 0.015 80)",
      accent: "oklch(0.55 0.15 200)",
      muted: "oklch(0.9 0.02 80)",
      mutedForeground: "oklch(0.4 0.02 40)",
      border: "oklch(0.85 0.02 70)",
      displayFont: "Fraunces",
      displayItalic: true,
      bodyFont: "Inter",
      radius: "0.5rem",
      motto: "Warm paper, sharp pen.",
    },
    thumbColor: "oklch(0.55 0.15 200)",
    defaultPreview: "editorial",
  },
  {
    slug: "3d-product-page",
    title: "3D Product Launch",
    tagline: "WebGL hero, scroll-locked storytelling, premium feel.",
    description:
      "For physical products that earn a moment. A 3D model anchors the hero, scroll progress drives the camera, and the rest of the page breathes underneath.",
    input: {
      prompt:
        "An immersive product launch site for a wireless audio brand with cinematic 3D and bold scroll-driven storytelling.",
      vibe: "bold",
      audience: "consumer",
      performance: "rich",
      includePaid: true,
    },
    stackOverride: ["nextjs", "r3f", "drei", "threejs", "tailwind", "shadcn", "lenis", "gsap"],
    headline: "Launch Capsule — model anchored, scroll choreographed.",
    rationale:
      "React Three Fiber + drei carry the hero; GSAP and Lenis hand off scroll progress to the camera so the product unfolds rather than scrolls past.",
    reasons: {
      nextjs: "RSC streaming + image optimization keeps LCP fast even with a 3D hero overhead.",
      r3f: "Compose the 3D scene in JSX next to the rest of the page — props, suspense, and lazy loads stay React-native.",
      drei: "Environment maps, OrbitControls, and primitive shaders cut weeks of glue code.",
      threejs: "The actual renderer — high-fidelity lighting, shadows, and post-processing.",
      tailwind: "The 2D chrome (cart, specs, footer) snaps to a grid instantly without bespoke CSS.",
      shadcn: "Add-to-cart drawer, size pickers, and dialogs come pre-styled and accessible.",
      lenis: "Smooth scroll converts viewport-locked moments into film cuts.",
      gsap: "ScrollTrigger ties camera position and material reveals to scroll progress, not time.",
    },
    theme: {
      name: "Capsule Black",
      background: "oklch(0.1 0.005 240)",
      foreground: "oklch(0.97 0 0)",
      card: "oklch(0.14 0.01 240)",
      primary: "oklch(0.85 0.18 60)",
      primaryForeground: "oklch(0.1 0.005 240)",
      accent: "oklch(0.7 0.22 25)",
      muted: "oklch(0.18 0.005 240)",
      mutedForeground: "oklch(0.6 0.005 240)",
      border: "oklch(0.22 0.005 240)",
      displayFont: "Space Grotesk",
      displayItalic: false,
      bodyFont: "Geist",
      radius: "0.25rem",
      motto: "Light bends to the object.",
    },
    thumbColor: "oklch(0.85 0.18 60)",
    defaultPreview: "hero",
  },
  {
    slug: "motion-marketing",
    title: "Motion Marketing",
    tagline: "A SaaS landing that feels alive without the bloat.",
    description:
      "For dev tools and modern SaaS. Crisp motion, scroll storytelling, and accessible chrome — the page sells without shouting.",
    input: {
      prompt:
        "A SaaS marketing page for an AI dev tool. Minimal, technical, fast to load, but with a hero moment.",
      vibe: "bold",
      audience: "developer",
      performance: "balanced",
      includePaid: true,
    },
    stackOverride: ["nextjs", "tailwind", "shadcn", "framer-motion", "lenis", "gsap", "ai-sdk"],
    headline: "Motion Marketing — alive without the bloat.",
    rationale:
      "Framer Motion handles micro-interactions, Lenis quiets the scroll, GSAP commands the hero, and the AI SDK powers a streaming demo so the page sells the product mid-scroll.",
    reasons: {
      nextjs: "App Router + RSCs ship the marketing chrome statically; the API surface stays tiny.",
      tailwind: "Atomic utility classes keep the marketing site CSS at near-zero growth as sections multiply.",
      shadcn: "Pricing, tabs, and dialogs come accessible by default — no a11y debt.",
      "framer-motion": "Spring-driven micro-interactions on cards, navs, and CTAs feel premium and on-brand.",
      lenis: "Smooth scroll across long marketing pages prevents the 'staircase' feel.",
      gsap: "Hero choreography (text mask, badge pop, gradient drift) anchors the page without jank.",
      "ai-sdk": "A live AI demo block — streamed in real time — converts curious devs into signups.",
    },
    theme: {
      name: "Cyber Vellum",
      background: "oklch(0.08 0.02 270)",
      foreground: "oklch(0.96 0.02 200)",
      card: "oklch(0.12 0.03 270)",
      primary: "oklch(0.85 0.2 195)",
      primaryForeground: "oklch(0.08 0.02 270)",
      accent: "oklch(0.72 0.25 320)",
      muted: "oklch(0.16 0.02 270)",
      mutedForeground: "oklch(0.6 0.03 240)",
      border: "oklch(0.25 0.03 270)",
      displayFont: "Space Grotesk",
      displayItalic: false,
      bodyFont: "Geist Mono",
      radius: "0.5rem",
      motto: "Soft glow, sharp signal.",
    },
    thumbColor: "oklch(0.85 0.2 195)",
    defaultPreview: "pricing",
  },
  {
    slug: "agency-immersive",
    title: "Immersive Agency",
    tagline: "A premium agency site that earns the brief.",
    description:
      "For studios and creative agencies that need to convince at the level of work, not template. Heavy on motion and atmosphere, light on chrome.",
    input: {
      prompt:
        "A creative agency site that opens with a cinematic 3D moment and continues with scroll-driven case studies.",
      vibe: "experimental",
      audience: "creative",
      performance: "rich",
      includePaid: true,
    },
    stackOverride: ["nextjs", "r3f", "drei", "threejs", "tailwind", "shadcn", "lenis", "gsap", "lottie"],
    headline: "Immersive Agency — atmosphere first, chrome last.",
    rationale:
      "A WebGL room you scroll through, with case studies cued to camera position. Lottie carries the micro-moments; shadcn quietly handles the contact dialog and pricing.",
    reasons: {
      nextjs: "Streaming case-study pages with RSC means each project loads instantly without a heavy SPA.",
      r3f: "The hero room is composable — every project feeds it new lights, models, and atmospheres.",
      drei: "Environment, ContactShadows, and PerformanceMonitor make the room production-ready.",
      threejs: "The actual rendering layer — lighting, shaders, and post-processing.",
      tailwind: "Holds the editorial chrome — case-study captions, navigation, and footers.",
      shadcn: "Contact and brief-request dialogs that look quiet next to a loud hero.",
      lenis: "The scroll IS the camera — Lenis prevents jank from breaking immersion.",
      gsap: "Scroll-tied camera + material transitions; the story is the scroll position.",
      lottie: "After-Effects moments — logo intros, transitions, micro-celebrations — drop in as JSON.",
    },
    theme: {
      name: "Studio Volume",
      background: "oklch(0.07 0.005 240)",
      foreground: "oklch(0.97 0 0)",
      card: "oklch(0.11 0.005 240)",
      primary: "oklch(0.92 0.22 125)",
      primaryForeground: "oklch(0.07 0.005 240)",
      accent: "oklch(0.78 0.2 50)",
      muted: "oklch(0.15 0.005 240)",
      mutedForeground: "oklch(0.62 0.005 240)",
      border: "oklch(0.2 0.005 240)",
      displayFont: "Instrument Serif",
      displayItalic: true,
      bodyFont: "Geist",
      radius: "0.625rem",
      motto: "The work walks itself in.",
    },
    thumbColor: "oklch(0.92 0.22 125)",
    defaultPreview: "hero",
  },
  {
    slug: "brutalist-saas",
    title: "Brutalist SaaS",
    tagline: "High-contrast, unapologetic, fast.",
    description:
      "For dev tools, infra, or any product that wants to look like a tool, not a toy. Hairline borders, monospace, no decoration unless it earns it.",
    input: {
      prompt:
        "A high-contrast brutalist SaaS landing for a developer infrastructure tool — minimal motion, very fast.",
      vibe: "bold",
      audience: "developer",
      performance: "max",
      includePaid: false,
    },
    stackOverride: ["nextjs", "tailwind", "shadcn", "radix", "framer-motion"],
    headline: "Brutalist SaaS — function as ornament.",
    rationale:
      "No 3D, no smoothing, no decoration. Just disciplined type, hairline borders, and a single Framer Motion micro-interaction reserved for the CTA.",
    reasons: {
      nextjs: "RSC + ISR means content updates without rebuilds and the bundle stays minimal.",
      tailwind: "Spacing and color tokens enforce the discipline brutalism demands.",
      shadcn: "Tabs, dialog, and tables come in unstyled — perfect for a brutalist re-skin.",
      radix: "All accessibility behavior is correct; the chrome on top can be as severe as we like.",
      "framer-motion": "Used sparingly — only one motion moment, and it lands hard because of it.",
    },
    theme: {
      name: "Mono Industrial",
      background: "oklch(0.1 0 0)",
      foreground: "oklch(0.95 0 0)",
      card: "oklch(0.14 0 0)",
      primary: "oklch(0.95 0 0)",
      primaryForeground: "oklch(0.1 0 0)",
      accent: "oklch(0.7 0.22 25)",
      muted: "oklch(0.18 0 0)",
      mutedForeground: "oklch(0.55 0 0)",
      border: "oklch(0.22 0 0)",
      displayFont: "JetBrains Mono",
      displayItalic: false,
      bodyFont: "JetBrains Mono",
      radius: "0rem",
      motto: "Operations manual aesthetic.",
    },
    thumbColor: "oklch(0.7 0.22 25)",
    defaultPreview: "pricing",
  },
  {
    slug: "playful-game",
    title: "Playful Launch",
    tagline: "Particles, physics, and joy — controlled.",
    description:
      "For consumer products with a playful soul: board games, kids' apps, sweet brands. Particles in the background, a draggable hero element, and bold flat color.",
    input: {
      prompt:
        "A playful landing page for a board game with physics interactions and particles.",
      vibe: "playful",
      audience: "consumer",
      performance: "rich",
      includePaid: false,
    },
    stackOverride: ["nextjs", "tailwind", "shadcn", "framer-motion", "tsparticles", "matter", "lenis"],
    headline: "Playful Launch — touch it, drop it, throw it.",
    rationale:
      "Matter.js handles a draggable hero token, tsParticles fills the negative space without stealing focus, and Framer Motion makes every button feel like a toy.",
    reasons: {
      nextjs: "Routes and metadata for SEO; the rest of the page is a single playful canvas.",
      tailwind: "Bold flat-color blocks come for free.",
      shadcn: "Pre-order dialog, FAQs, and footer — quiet so the play moments shine.",
      "framer-motion": "Spring physics on every CTA, badge, and card — the page feels alive at idle.",
      tsparticles: "Subtle drift particles that respond to the cursor without performance cost.",
      matter: "A draggable, throwable hero token. Real physics, instant joy.",
      lenis: "Smooth scroll keeps the hand-feel consistent end to end.",
    },
    theme: {
      name: "Solar Brutalist",
      background: "oklch(0.97 0.02 90)",
      foreground: "oklch(0.15 0.01 60)",
      card: "oklch(0.99 0.01 90)",
      primary: "oklch(0.18 0.02 60)",
      primaryForeground: "oklch(0.97 0.02 90)",
      accent: "oklch(0.7 0.22 30)",
      muted: "oklch(0.92 0.02 80)",
      mutedForeground: "oklch(0.45 0.01 60)",
      border: "oklch(0.15 0.01 60)",
      displayFont: "Bricolage Grotesque",
      displayItalic: false,
      bodyFont: "Geist",
      radius: "1rem",
      motto: "Hot ink on bone paper.",
    },
    thumbColor: "oklch(0.7 0.22 30)",
    defaultPreview: "hero",
  },
]

export function getRecipe(slug: string): Recipe | undefined {
  return RECIPES.find((r) => r.slug === slug)
}
