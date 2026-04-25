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

/** The original Prism Studio dark editorial theme — used as default */
export const DEFAULT_THEME: Theme = {
  name: "Prism Default",
  background: "oklch(0.13 0.005 240)",
  foreground: "oklch(0.98 0 0)",
  card: "oklch(0.16 0.005 240)",
  primary: "oklch(0.92 0.22 125)",
  primaryForeground: "oklch(0.13 0.005 240)",
  accent: "oklch(0.72 0.2 45)",
  muted: "oklch(0.2 0.005 240)",
  mutedForeground: "oklch(0.65 0.005 240)",
  border: "oklch(0.25 0.005 240)",
  displayFont: "Instrument Serif",
  displayItalic: true,
  bodyFont: "Geist",
  radius: "0.625rem",
  motto: "Compose interfaces that refract ideas into pixels.",
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
