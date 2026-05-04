export type Theme = {
  name: string
  /** OKLCH-formatted CSS values, e.g. "oklch(0.92 0.22 125)" */
  background: string
  foreground: string
  card: string
  primary: string
  primaryForeground: string
  accent: string
  muted: string
  mutedForeground: string
  border: string
  /** Display font name from Google Fonts (e.g. "Instrument Serif") */
  displayFont: string
  /** Whether the display font should default to italic */
  displayItalic: boolean
  /** Body font name from Google Fonts */
  bodyFont: string
  /** Corner radius in rem, e.g. "0.625rem" */
  radius: string
  /** A short evocative motto for the design system */
  motto: string
}

/**
 * UXC default theme — warm-tinted dark canvas with a coral-magenta
 * primary, deep-purple accent, and Instrument Serif display.
 *
 * Palette is the canonical center of the brand sunset gradient
 * (yellow #FFC857 → orange #FF8A3D → coral #FF3D6A → magenta #B13D8A
 * → purple #5B2A86). Rendered in OKLCH so the AI theme generator can
 * keep producing variants in the same color space.
 */
export const DEFAULT_THEME: Theme = {
  name: "UXC Default",
  background: "oklch(0.13 0.012 30)",
  foreground: "oklch(0.97 0.005 70)",
  card: "oklch(0.16 0.014 30)",
  primary: "oklch(0.69 0.22 18)",
  primaryForeground: "oklch(0.13 0.012 30)",
  accent: "oklch(0.50 0.18 320)",
  muted: "oklch(0.21 0.012 30)",
  mutedForeground: "oklch(0.66 0.012 50)",
  border: "oklch(0.26 0.012 30)",
  displayFont: "Instrument Serif",
  displayItalic: true,
  bodyFont: "Geist",
  radius: "0.625rem",
  motto: "UX, curated.",
}

/** Curated presets for the command palette */
export const THEME_PRESETS: Theme[] = [
  DEFAULT_THEME,
  {
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
    radius: "0rem",
    motto: "Hot ink on bone paper.",
  },
  {
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
    radius: "0.25rem",
    motto: "Soft glow, sharp signal.",
  },
  {
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
    radius: "0.75rem",
    motto: "Warm paper, sharp pen.",
  },
  {
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
]

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.style.setProperty("--background", theme.background)
  root.style.setProperty("--foreground", theme.foreground)
  root.style.setProperty("--card", theme.card)
  root.style.setProperty("--card-foreground", theme.foreground)
  root.style.setProperty("--popover", theme.background)
  root.style.setProperty("--popover-foreground", theme.foreground)
  root.style.setProperty("--primary", theme.primary)
  root.style.setProperty("--primary-foreground", theme.primaryForeground)
  root.style.setProperty("--secondary", theme.muted)
  root.style.setProperty("--secondary-foreground", theme.foreground)
  root.style.setProperty("--muted", theme.muted)
  root.style.setProperty("--muted-foreground", theme.mutedForeground)
  root.style.setProperty("--accent", theme.accent)
  root.style.setProperty("--accent-foreground", theme.foreground)
  root.style.setProperty("--border", theme.border)
  root.style.setProperty("--input", theme.muted)
  root.style.setProperty("--ring", theme.primary)
  root.style.setProperty("--radius", theme.radius)
  root.style.setProperty("--font-display-family", `"${theme.displayFont}"`)
  root.style.setProperty("--font-body-family", `"${theme.bodyFont}"`)
  root.dataset.themeName = theme.name
}

export function resetTheme() {
  if (typeof document === "undefined") return
  applyTheme(DEFAULT_THEME)
}
