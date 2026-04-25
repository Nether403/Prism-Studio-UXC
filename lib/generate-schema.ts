import { z } from "zod"

export const themeSchema = z.object({
  name: z.string().describe("A short evocative name for this design system, max 3 words."),
  background: z
    .string()
    .describe(
      "OKLCH CSS string for the page background. Format must be exactly: oklch(L C H) where L is 0-1, C is 0-0.4, H is 0-360."
    ),
  foreground: z.string().describe("OKLCH CSS string for the primary text color."),
  card: z.string().describe("OKLCH CSS string for card surfaces, slightly lifted from background."),
  primary: z.string().describe("OKLCH CSS string for the brand color used on buttons and accents."),
  primaryForeground: z.string().describe("OKLCH CSS string for text on primary."),
  accent: z.string().describe("OKLCH CSS string for a complementary accent color."),
  muted: z.string().describe("OKLCH CSS string for muted surfaces."),
  mutedForeground: z.string().describe("OKLCH CSS string for muted/secondary text."),
  border: z.string().describe("OKLCH CSS string for borders and dividers."),
  displayFont: z
    .string()
    .describe(
      "Display/heading font name. Choose ONE of: 'Instrument Serif', 'Bricolage Grotesque', 'Space Grotesk', 'Fraunces', 'JetBrains Mono', 'Playfair Display', 'DM Serif Display', 'Anton'."
    ),
  displayItalic: z.boolean().describe("Whether the display font should default to italic style."),
  bodyFont: z
    .string()
    .describe(
      "Body font name. Choose ONE of: 'Geist', 'Inter', 'Geist Mono', 'JetBrains Mono', 'Plus Jakarta Sans'."
    ),
  radius: z
    .string()
    .describe("Corner radius in rem, e.g. '0rem' for sharp, '0.5rem' for soft, '1rem' for pillowy."),
  motto: z.string().describe("A short evocative motto, under 80 characters."),
})

export const generateResponseSchema = z.object({
  headline: z
    .string()
    .describe("A short, evocative summary of the recommended composition, under 90 characters."),
  rationale: z
    .string()
    .describe(
      "A 2-3 sentence explanation of WHY this stack and theme suit the brief. Confident, design-critic voice."
    ),
  reasons: z
    .array(
      z.object({
        libraryId: z.string().describe("One of the library ids from the provided stack."),
        why: z.string().describe("One concise sentence on why THIS library serves THIS specific brief."),
      })
    )
    .describe("One reason per library in the recommended stack, in the same order."),
  theme: themeSchema,
})

export type GenerateResponse = z.infer<typeof generateResponseSchema>
export type GenerateTheme = z.infer<typeof themeSchema>
