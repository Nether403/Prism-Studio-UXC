"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Wand2,
  Lock,
  ExternalLink,
  Cpu,
  Gauge,
  Palette,
  Save,
  RotateCcw,
  Share2,
  Copy,
} from "lucide-react"
import {
  recommend,
  type Audience,
  type GeneratorInput,
  type Performance,
  type Recommendation,
  type Vibe,
} from "@/lib/recommend"
import { generateResponseSchema, type GenerateResponse, type GenerateTheme } from "@/lib/generate-schema"
import { usePrismTheme } from "@/components/prism-theme-provider"
import type { Theme } from "@/lib/themes"
import { saveStack } from "@/app/actions/stack"
import { cn } from "@/lib/utils"

const SUGGESTIONS = [
  "An immersive product launch site for a wireless audio brand with cinematic 3D and bold scroll-driven storytelling.",
  "A creative portfolio for a typographer — editorial, magazine-feel, with smooth scrolling and tasteful motion.",
  "A SaaS marketing page for an AI dev tool. Minimal, technical, fast to load, but with a hero moment.",
  "A playful landing page for a board game with physics interactions and particles.",
]

function aiThemeToTheme(t: GenerateTheme): Theme {
  return {
    name: t.name,
    background: t.background,
    foreground: t.foreground,
    card: t.card,
    primary: t.primary,
    primaryForeground: t.primaryForeground,
    accent: t.accent,
    muted: t.muted,
    mutedForeground: t.mutedForeground,
    border: t.border,
    displayFont: t.displayFont,
    displayItalic: t.displayItalic,
    bodyFont: t.bodyFont,
    radius: t.radius,
    motto: t.motto,
  }
}

export function Generator() {
  const { setTheme, reset } = usePrismTheme()
  const [prompt, setPrompt] = useState(SUGGESTIONS[0])
  const [vibe, setVibe] = useState<Vibe>("editorial")
  const [audience, setAudience] = useState<Audience>("creative")
  const [performance, setPerformance] = useState<Performance>("balanced")
  const [includePaid, setIncludePaid] = useState(true)
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const resultRef = useRef<HTMLDivElement>(null)

  const input: GeneratorInput = useMemo(
    () => ({ prompt, vibe, audience, performance, includePaid }),
    [prompt, vibe, audience, performance, includePaid]
  )

  const { object, submit, isLoading, error, stop } = useObject<GenerateResponse>({
    api: "/api/generate",
    schema: generateResponseSchema,
  })

  function handleGenerate() {
    const rec = recommend(input)
    setRecommendation(rec)
    setSavedId(null)
    submit(input)
  }

  // Initial deterministic recommendation so the page feels alive on load
  useEffect(() => {
    setRecommendation(recommend(input))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Animate static recommendation cards
  useEffect(() => {
    if (!recommendation || !resultRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(".result-summary", {
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      })
      gsap.from(".result-card", {
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.06,
        delay: 0.05,
      })
      gsap.from(".meter-bar", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.1,
        delay: 0.2,
      })
    }, resultRef)
    return () => ctx.revert()
  }, [recommendation])

  const reasonMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    object?.reasons?.forEach((r) => {
      if (r?.libraryId && r.why) map[r.libraryId] = r.why
    })
    return map
  }, [object?.reasons])

  function handleApplyTheme() {
    if (!object?.theme) return
    try {
      const theme = aiThemeToTheme(object.theme as GenerateTheme)
      setTheme(theme)
      toast.success(`Applied "${theme.name}"`, {
        description: "Page re-themed with your generated tokens.",
      })
    } catch (e) {
      toast.error("Could not apply theme")
    }
  }

  async function handleSave() {
    if (!recommendation || !object?.headline || !object?.theme) {
      toast.error("Wait for generation to finish.")
      return
    }
    setIsSaving(true)
    const reasons: Record<string, string> = {}
    object.reasons?.forEach((r) => {
      if (r?.libraryId && r.why) reasons[r.libraryId] = r.why
    })

    const res = await saveStack({
      prompt: input.prompt,
      vibe: input.vibe,
      audience: input.audience,
      performance: input.performance,
      includePaid: input.includePaid,
      headline: object.headline,
      rationale: object.rationale ?? "",
      stackIds: recommendation.stack.map((s) => s.id),
      reasons,
      theme: object.theme,
      impactScore: recommendation.impactScore,
      perfBudget: recommendation.perfBudget,
    })
    setIsSaving(false)
    if ("id" in res) {
      setSavedId(res.id)
      toast.success("Saved to gallery", {
        description: "Anyone with the link can view this stack.",
        action: {
          label: "Open",
          onClick: () => window.open(`/s/${res.id}`, "_blank"),
        },
      })
    } else {
      toast.error("Could not save", { description: res.error })
    }
  }

  function handleCopyShare() {
    if (!savedId) return
    const url = `${window.location.origin}/s/${savedId}`
    navigator.clipboard.writeText(url)
    toast.success("Share link copied")
  }

  const hasAi = !!object?.headline
  const headline = object?.headline ?? recommendation?.summary ?? ""

  return (
    <section id="generator" className="relative py-24 md:py-32 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.4fr] lg:gap-16">
          {/* Input panel */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionLabel index="01" label="Brief" />
            <h2 className="mt-4 font-display text-5xl md:text-6xl tracking-[-0.03em] leading-[0.95] text-balance">
              Describe what you&apos;re building.
            </h2>
            <p className="mt-5 text-muted-foreground max-w-md text-pretty">
              We turn it into a tuned stack. Mention the audience, the vibe, the moments that
              should feel cinematic.
            </p>

            <Card className="mt-8 p-1 border-border bg-card">
              <div className="rounded-md bg-background/40 p-5">
                <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Idea
                </Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  className="mt-2 resize-none border-0 bg-transparent px-0 text-base leading-relaxed shadow-none focus-visible:ring-0 focus-visible:border-0"
                  placeholder="An interactive launch site for a fragrance brand…"
                />

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(s)}
                      className="rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground transition"
                      data-cursor="hover"
                    >
                      {s.slice(0, 32).split(" ").slice(0, 4).join(" ")}…
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 p-5 border-t border-border">
                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Vibe
                  </Label>
                  <ToggleGroup
                    type="single"
                    value={vibe}
                    onValueChange={(v) => v && setVibe(v as Vibe)}
                    className="mt-2 flex flex-wrap gap-2"
                  >
                    {(["minimal", "bold", "editorial", "playful", "experimental"] as Vibe[]).map(
                      (v) => (
                        <ToggleGroupItem
                          key={v}
                          value={v}
                          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs capitalize data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                        >
                          {v}
                        </ToggleGroupItem>
                      )
                    )}
                  </ToggleGroup>
                </div>

                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Audience
                  </Label>
                  <ToggleGroup
                    type="single"
                    value={audience}
                    onValueChange={(v) => v && setAudience(v as Audience)}
                    className="mt-2 flex flex-wrap gap-2"
                  >
                    {(["consumer", "enterprise", "developer", "creative"] as Audience[]).map((a) => (
                      <ToggleGroupItem
                        key={a}
                        value={a}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs capitalize data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                      >
                        {a}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div>
                  <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Performance budget
                  </Label>
                  <ToggleGroup
                    type="single"
                    value={performance}
                    onValueChange={(v) => v && setPerformance(v as Performance)}
                    className="mt-2 flex flex-wrap gap-2"
                  >
                    {(
                      [
                        { id: "max", label: "Max perf" },
                        { id: "balanced", label: "Balanced" },
                        { id: "rich", label: "Visually rich" },
                      ] as { id: Performance; label: string }[]
                    ).map((p) => (
                      <ToggleGroupItem
                        key={p.id}
                        value={p.id}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                      >
                        {p.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border bg-background/40 p-3">
                  <div>
                    <Label className="text-sm">Include paid / auth-required</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      v0, Spline, Figma API, AI SDK
                    </p>
                  </div>
                  <Switch checked={includePaid} onCheckedChange={setIncludePaid} />
                </div>
              </div>

              <div className="p-3 border-t border-border flex gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || prompt.trim().length < 6}
                  className="flex-1 h-12 text-base font-medium"
                  size="lg"
                  data-cursor="hover"
                >
                  {isLoading ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
                      Composing with AI…
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Compose stack
                    </>
                  )}
                </Button>
                {isLoading && (
                  <Button variant="outline" onClick={() => stop()} size="lg" className="h-12">
                    Stop
                  </Button>
                )}
              </div>
              {error && (
                <div className="px-5 pb-4 text-xs text-destructive">
                  {error instanceof Error ? error.message : "Generation failed."}
                </div>
              )}
            </Card>
          </div>

          {/* Result panel */}
          <div ref={resultRef} className="min-h-[600px]">
            <SectionLabel index="02" label={hasAi ? "AI-curated stack" : "Recommended stack"} />
            {recommendation && (
              <>
                <div className="result-summary mt-4">
                  <h3
                    className={cn(
                      "font-display text-3xl md:text-4xl tracking-[-0.02em] leading-tight text-pretty min-h-[3rem]",
                      isLoading && !object?.headline && "opacity-60"
                    )}
                  >
                    {headline || (isLoading ? "Composing…" : "")}
                    {isLoading && object?.headline && (
                      <span className="inline-block w-2 h-7 ml-1 bg-primary animate-pulse align-baseline" />
                    )}
                  </h3>
                  {object?.rationale && (
                    <p className="mt-3 text-muted-foreground leading-relaxed text-pretty max-w-2xl">
                      {object.rationale}
                    </p>
                  )}
                </div>

                {/* Meters */}
                <div className="result-summary mt-8 grid grid-cols-2 gap-4">
                  <Meter
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    label="Visual impact"
                    value={recommendation.impactScore}
                    accent="primary"
                  />
                  <Meter
                    icon={<Gauge className="h-3.5 w-3.5" />}
                    label="Performance load"
                    value={recommendation.perfBudget}
                    accent="accent"
                    invert
                  />
                </div>

                {/* AI Theme card */}
                {object?.theme && <ThemeCard theme={object.theme} onApply={handleApplyTheme} onReset={reset} />}

                {/* Stack list */}
                <ol className="mt-10 grid gap-3">
                  {recommendation.stack.map((lib, i) => (
                    <li key={lib.id} className="result-card">
                      <StackCard
                        library={lib}
                        index={i}
                        aiReason={reasonMap[lib.id]}
                        streaming={isLoading}
                      />
                    </li>
                  ))}
                </ol>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed border-border p-5">
                  <div className="flex items-center gap-3">
                    <Cpu className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-medium">
                        {savedId ? "Saved" : "Ready to save"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {savedId
                          ? `Share at /s/${savedId}`
                          : "Publish this stack to the public gallery."}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {savedId ? (
                      <>
                        <Button variant="outline" size="sm" onClick={handleCopyShare}>
                          <Copy className="h-3.5 w-3.5" />
                          Copy link
                        </Button>
                        <a
                          href={`/s/${savedId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex"
                        >
                          <Button size="sm">
                            <Share2 className="h-3.5 w-3.5" />
                            Open share
                          </Button>
                        </a>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const spec = buildSpec(recommendation, object)
                            navigator.clipboard.writeText(spec)
                            toast.success("Spec copied to clipboard")
                          }}
                          disabled={isLoading}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy spec
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={isLoading || isSaving || !object?.headline || !object?.theme}
                          data-cursor="hover"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {isSaving ? "Saving…" : "Save to gallery"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function buildSpec(rec: Recommendation, ai: Partial<GenerateResponse> | undefined): string {
  const lines = [
    `# ${ai?.headline ?? rec.summary}`,
    "",
    ai?.rationale ? `> ${ai.rationale}` : "",
    "",
    "## Stack",
    ...rec.stack.map(
      (s, i) =>
        `${i + 1}. **${s.name}** (${s.category}) — ${s.tagline}${
          ai?.reasons?.find((r) => r?.libraryId === s.id)?.why
            ? `\n    - Why: ${ai?.reasons?.find((r) => r?.libraryId === s.id)?.why}`
            : ""
        }`
    ),
    "",
    "## Theme",
    ai?.theme ? "```css\n" + themeToCss(ai.theme as GenerateTheme) + "\n```" : "",
  ]
  return lines.filter(Boolean).join("\n")
}

function themeToCss(t: GenerateTheme): string {
  return `:root {
  --background: ${t.background};
  --foreground: ${t.foreground};
  --primary: ${t.primary};
  --accent: ${t.accent};
  --radius: ${t.radius};
  --font-display: "${t.displayFont}";
  --font-body: "${t.bodyFont}";
}`
}

function ThemeCard({
  theme,
  onApply,
  onReset,
}: {
  theme: Partial<GenerateTheme>
  onApply: () => void
  onReset: () => void
}) {
  const swatches: Array<{ key: keyof GenerateTheme; label: string }> = [
    { key: "background", label: "BG" },
    { key: "foreground", label: "FG" },
    { key: "primary", label: "Primary" },
    { key: "accent", label: "Accent" },
    { key: "card", label: "Card" },
    { key: "border", label: "Border" },
  ]

  const ready = !!(theme.background && theme.foreground && theme.primary && theme.accent)

  return (
    <Card className="result-summary mt-6 overflow-hidden border-primary/20 bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Generated theme
          </span>
          {theme.name && (
            <span className="font-display text-lg italic ml-1">— {theme.name}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onReset} className="h-8">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={onApply} disabled={!ready} className="h-8" data-cursor="hover">
            <Palette className="h-3.5 w-3.5" />
            Apply to page
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-px bg-border">
        {swatches.map((s) => {
          const value = theme[s.key] as string | undefined
          return (
            <div key={s.key} className="bg-card p-3">
              <div
                className="h-12 w-full rounded-sm border border-border"
                style={{ background: value ?? "transparent" }}
              />
              <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
              <div className="font-mono text-[10px] tabular-nums truncate text-foreground/70">
                {value ?? "…"}
              </div>
            </div>
          )
        })}
      </div>
      {(theme.displayFont || theme.bodyFont || theme.motto) && (
        <div className="grid grid-cols-3 gap-px bg-border">
          <div className="bg-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Display
            </div>
            <div className="mt-1 text-xl">{theme.displayFont ?? "…"}</div>
          </div>
          <div className="bg-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Body
            </div>
            <div className="mt-1 text-xl">{theme.bodyFont ?? "…"}</div>
          </div>
          <div className="bg-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Radius
            </div>
            <div className="mt-1 text-xl tabular-nums">{theme.radius ?? "…"}</div>
          </div>
        </div>
      )}
      {theme.motto && (
        <div className="border-t border-border px-5 py-3 text-sm text-muted-foreground italic">
          “{theme.motto}”
        </div>
      )}
    </Card>
  )
}

function StackCard({
  library,
  index,
  aiReason,
  streaming,
}: {
  library: Recommendation["stack"][number]
  index: number
  aiReason?: string
  streaming?: boolean
}) {
  return (
    <Card
      className="group relative overflow-hidden p-5 transition-colors hover:border-primary/40"
      data-cursor="hover"
    >
      <div className="flex items-start gap-5">
        <div className="font-mono text-xs text-muted-foreground tabular-nums w-6 pt-0.5">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-display text-2xl tracking-tight">{library.name}</h4>
            <Badge
              variant="outline"
              className="font-mono text-[10px] uppercase tracking-wider border-border"
            >
              {library.category}
            </Badge>
            {library.tier !== "free" && (
              <Badge
                variant="outline"
                className="font-mono text-[10px] uppercase tracking-wider border-accent/40 text-accent"
              >
                {library.tier === "paid" ? "paid" : "freemium"}
              </Badge>
            )}
            {library.requiresAuth && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <Lock className="h-2.5 w-2.5" />
                auth
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{library.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-pretty">{library.description}</p>

          {aiReason ? (
            <div className="mt-4 rounded-md border-l-2 border-primary bg-primary/5 px-3 py-2 text-sm leading-relaxed">
              <span className="font-mono text-[10px] uppercase tracking-wider text-primary mr-2">
                Why
              </span>
              {aiReason}
            </div>
          ) : streaming ? (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              <span className="font-mono uppercase tracking-wider">awaiting rationale</span>
            </div>
          ) : library.reasons.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {library.reasons.slice(0, 4).map((r, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {r}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <a
            href={library.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            aria-label={`Open ${library.name} docs`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Impact
            </div>
            <div className="font-mono text-sm tabular-nums">{library.impact}/10</div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/40 transition-colors" />
    </Card>
  )
}

function Meter({
  label,
  value,
  icon,
  accent,
  invert,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent: "primary" | "accent"
  invert?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="font-mono text-sm tabular-nums">{value}</div>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "meter-bar h-full rounded-full",
            accent === "primary" ? "bg-primary" : "bg-accent",
            invert && value > 65 && "bg-destructive"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
      <span className="text-primary">{index}</span>
      <span className="h-px w-8 bg-border" />
      <span>{label}</span>
    </div>
  )
}
