export type Tier = "free" | "freemium" | "paid"
export type Category =
  | "framework"
  | "3d"
  | "motion"
  | "ui"
  | "styling"
  | "scroll"
  | "ai"
  | "components"
  | "assets"

export type Library = {
  id: string
  name: string
  category: Category
  tagline: string
  description: string
  tier: Tier
  url: string
  /** Tags that drive the recommendation engine */
  tags: string[]
  /** Higher = more visually striking by default */
  impact: number // 1-10
  /** Higher = heavier bundle / steeper curve */
  weight: number // 1-10
  /** Whether the library typically requires an account / API key */
  requiresAuth?: boolean
}

export const LIBRARIES: Library[] = [
  {
    id: "nextjs",
    name: "Next.js",
    category: "framework",
    tagline: "App Router, RSC, edge-ready",
    description:
      "Production-grade React framework with file-based routing, streaming, image optimization, and first-class SEO.",
    tier: "free",
    url: "https://nextjs.org",
    tags: ["seo", "performance", "ssr", "routing", "scalable", "saas", "ecommerce", "marketing", "any"],
    impact: 6,
    weight: 4,
  },
  {
    id: "threejs",
    name: "Three.js",
    category: "3d",
    tagline: "WebGL, declarative 3D",
    description:
      "Industry-standard WebGL library. Pair with React Three Fiber for declarative scenes, lighting, and shaders.",
    tier: "free",
    url: "https://threejs.org",
    tags: ["3d", "webgl", "immersive", "hero", "product", "portfolio", "creative", "bold", "experimental"],
    impact: 10,
    weight: 8,
  },
  {
    id: "r3f",
    name: "React Three Fiber",
    category: "3d",
    tagline: "Three.js, the React way",
    description:
      "Reconciler that lets you compose Three.js scenes with components, hooks, and Suspense. Pair with drei.",
    tier: "free",
    url: "https://r3f.docs.pmnd.rs",
    tags: ["3d", "webgl", "immersive", "creative", "react", "experimental"],
    impact: 9,
    weight: 7,
  },
  {
    id: "webgpu",
    name: "WebGPU",
    category: "3d",
    tagline: "Next-gen GPU pipeline",
    description:
      "Modern, low-overhead GPU API with compute shaders. Great for particle systems, volumetric effects, and ML.",
    tier: "free",
    url: "https://www.w3.org/TR/webgpu/",
    tags: ["3d", "shaders", "experimental", "performance", "particles", "bold"],
    impact: 10,
    weight: 9,
  },
  {
    id: "gsap",
    name: "GSAP",
    category: "motion",
    tagline: "Timeline-precise motion",
    description:
      "The most reliable animation engine on the web. ScrollTrigger, SplitText, Flip — works everywhere, never jank.",
    tier: "freemium",
    url: "https://gsap.com",
    tags: ["motion", "scroll", "hero", "narrative", "editorial", "bold", "marketing", "portfolio"],
    impact: 9,
    weight: 4,
  },
  {
    id: "framer-motion",
    name: "Motion (Framer)",
    category: "motion",
    tagline: "Declarative React motion",
    description:
      "Spring physics, layout animations, and gestures — designed for React. Ideal for UI micro-interactions.",
    tier: "free",
    url: "https://motion.dev",
    tags: ["motion", "ui", "saas", "dashboard", "gestures", "minimal", "any"],
    impact: 7,
    weight: 3,
  },
  {
    id: "lenis",
    name: "Lenis",
    category: "scroll",
    tagline: "Buttery smooth scrolling",
    description:
      "Lightweight, accessible smooth-scroll. Drop in once and every section glides — pairs perfectly with GSAP.",
    tier: "free",
    url: "https://lenis.darkroom.engineering",
    tags: ["scroll", "narrative", "editorial", "portfolio", "marketing", "any"],
    impact: 7,
    weight: 1,
  },
  {
    id: "tailwind",
    name: "Tailwind CSS",
    category: "styling",
    tagline: "Utility-first styling",
    description:
      "Compose interfaces with constraints. Tiny runtime, design-token aware, JIT compiled — production proof.",
    tier: "free",
    url: "https://tailwindcss.com",
    tags: ["styling", "performance", "utility", "any", "fast", "saas", "marketing"],
    impact: 6,
    weight: 1,
  },
  {
    id: "shadcn",
    name: "shadcn/ui",
    category: "ui",
    tagline: "Own your components",
    description:
      "Beautifully designed, accessible Radix-powered components — copy into your codebase, theme to taste.",
    tier: "free",
    url: "https://ui.shadcn.com",
    tags: ["ui", "components", "radix", "accessible", "saas", "dashboard", "any"],
    impact: 7,
    weight: 2,
  },
  {
    id: "radix",
    name: "Radix Primitives",
    category: "ui",
    tagline: "Unstyled, accessible primitives",
    description:
      "The component substrate that powers shadcn/ui. Keyboard-perfect dialogs, popovers, menus — wcag-aligned.",
    tier: "free",
    url: "https://www.radix-ui.com",
    tags: ["ui", "accessible", "primitives", "any"],
    impact: 5,
    weight: 2,
  },
  {
    id: "v0",
    name: "v0 by Vercel",
    category: "components",
    tagline: "AI UI generation",
    description:
      "Generate React, shadcn, and Tailwind components from a prompt. Iterate visually, ship to a Vercel project.",
    tier: "freemium",
    url: "https://v0.app",
    tags: ["ai", "components", "saas", "dashboard", "marketing", "fast", "any"],
    impact: 8,
    weight: 1,
    requiresAuth: true,
  },
  {
    id: "ai-sdk",
    name: "AI SDK",
    category: "ai",
    tagline: "Streaming, tools, agents",
    description:
      "Vercel AI SDK — model-agnostic streaming, structured output, tool calls. Plug into Gateway with one string.",
    tier: "freemium",
    url: "https://sdk.vercel.ai",
    tags: ["ai", "streaming", "agent", "saas"],
    impact: 7,
    weight: 3,
    requiresAuth: true,
  },
  {
    id: "lottie",
    name: "Lottie",
    category: "motion",
    tagline: "After Effects → web",
    description:
      "Render After Effects animations as crisp vectors. Perfect for hero illustrations and onboarding moments.",
    tier: "free",
    url: "https://lottiefiles.com",
    tags: ["motion", "illustration", "marketing", "onboarding", "playful"],
    impact: 6,
    weight: 3,
  },
  {
    id: "spline",
    name: "Spline",
    category: "3d",
    tagline: "3D in the browser, designed",
    description:
      "Drag-and-drop 3D editor with a runtime. Drop interactive scenes into a Next.js page in seconds.",
    tier: "freemium",
    url: "https://spline.design",
    tags: ["3d", "designer", "hero", "playful", "marketing", "portfolio"],
    impact: 9,
    weight: 6,
    requiresAuth: true,
  },
  {
    id: "figma",
    name: "Figma API",
    category: "assets",
    tagline: "Design tokens & assets",
    description:
      "Pipe variables, components, and frames straight from Figma into your codebase via the REST API.",
    tier: "freemium",
    url: "https://www.figma.com/developers/api",
    tags: ["assets", "tokens", "design-system", "any"],
    impact: 5,
    weight: 2,
    requiresAuth: true,
  },
  {
    id: "tsparticles",
    name: "tsParticles",
    category: "motion",
    tagline: "Particles, confetti, fireworks",
    description:
      "Performance-tuned particle engine. Background ambient effects, celebrations, success states.",
    tier: "free",
    url: "https://particles.js.org",
    tags: ["particles", "motion", "playful", "hero", "background"],
    impact: 6,
    weight: 3,
  },
  {
    id: "ogl",
    name: "OGL",
    category: "3d",
    tagline: "Tiny WebGL framework",
    description:
      "Minimal WebGL toolkit — perfect when Three.js feels too heavy and you want raw shader control.",
    tier: "free",
    url: "https://github.com/oframe/ogl",
    tags: ["3d", "webgl", "shaders", "performance", "experimental"],
    impact: 8,
    weight: 5,
  },
  {
    id: "matter",
    name: "Matter.js",
    category: "motion",
    tagline: "2D rigid body physics",
    description:
      "Drop-in 2D physics — make hero elements collide, stack, and tumble for delightful interactivity.",
    tier: "free",
    url: "https://brm.io/matter-js/",
    tags: ["physics", "playful", "hero", "interactive"],
    impact: 7,
    weight: 4,
  },
  {
    id: "rapier",
    name: "Rapier",
    category: "3d",
    tagline: "3D physics for R3F",
    description:
      "Rust-powered 3D physics with React Three Fiber bindings. Rigid bodies, joints, sensors — at 60fps.",
    tier: "free",
    url: "https://rapier.rs",
    tags: ["3d", "physics", "interactive", "experimental"],
    impact: 9,
    weight: 7,
  },
  {
    id: "drei",
    name: "drei",
    category: "3d",
    tagline: "R3F helpers, batteries-included",
    description:
      "Cameras, controls, environments, post-processing, MeshTransmissionMaterial — the R3F superstore.",
    tier: "free",
    url: "https://github.com/pmndrs/drei",
    tags: ["3d", "webgl", "creative", "hero"],
    impact: 8,
    weight: 4,
  },
]
