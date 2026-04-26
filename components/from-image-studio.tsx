"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ImagePlus,
  Loader2,
  Link2,
  Clipboard,
  ArrowRight,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LIBRARIES } from "@/lib/stack-data"
import { DEFAULT_THEME, type Theme } from "@/lib/themes"
import { recommend } from "@/lib/recommend"
import { signatureToV0DeepLink, type Signature } from "@/lib/signature"
import { saveStack } from "@/app/actions/stack"
import { linkInspirationToStack } from "@/app/actions/inspiration"
import { SignatureCard } from "@/components/signature-card"
import { VariantPicker, type Variant } from "@/components/variant-picker"
import type { GenerateResponse, GenerateTheme } from "@/lib/generate-schema"
import { listAllowedOgDomains } from "@/lib/og"

type Phase = "idle" | "extracting" | "ready" | "saving"

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

export function FromImageStudio({ userEmail }: { userEmail: string | null }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [signature, setSignature] = useState<Signature | null>(null)
  const [inspirationId, setInspirationId] = useState<string | null>(null)
  const [editedBrief, setEditedBrief] = useState<string>("")
  const [ogUrl, setOgUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Submit either a File or an ogUrl. Exactly one of the two should be set.
  const submit = useCallback(
    async (input: { file?: File; ogUrl?: string }) => {
      setPhase("extracting")
      setError(null)
      setSignature(null)
      setInspirationId(null)

      if (input.file) {
        const url = URL.createObjectURL(input.file)
        setPreviewUrl(url)
      } else if (input.ogUrl) {
        setPreviewUrl(null)
      }

      try {
        const form = new FormData()
        if (input.file) form.set("file", input.file)
        if (input.ogUrl) form.set("ogUrl", input.ogUrl)

        const res = await fetch("/api/inspire", { method: "POST", body: form })
        const json = (await res.json().catch(() => ({}))) as
          | { error: string }
          | { inspirationId: string | null; signature: Signature; cached: boolean }

        if (!res.ok || "error" in json) {
          throw new Error("error" in json ? json.error : "Couldn't read that image.")
        }

        setSignature(json.signature)
        setInspirationId(json.inspirationId)
        setEditedBrief(json.signature.brief)
        if (input.ogUrl) {
          setPreviewUrl(json.signature.source.ref)
        }
        setPhase("ready")

        if (json.cached) {
          toast.info("Pulled from cache", {
            description: "We've seen this image before — instant signature.",
          })
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong."
        setError(msg)
        setPhase("idle")
        toast.error("Couldn't extract a signature", { description: msg })
      }
    },
    []
  )

  // Clipboard paste handler — works anywhere on the page when phase is idle.
  useEffect(() => {
    if (phase !== "idle") return
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            void submit({ file })
            return
          }
        }
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [phase, submit])

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) {
      void submit({ file })
    } else {
      toast.error("Drop an image file.")
    }
  }

  function reset() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setSignature(null)
    setInspirationId(null)
    setEditedBrief("")
    setError(null)
    setOgUrl("")
    setPhase("idle")
  }

  async function handleVariantPick(v: Variant) {
    if (!signature || !v.ai) return
    setPhase("saving")
    const reasons: Record<string, string> = {}
    v.ai.reasons?.forEach((r) => {
      if (r?.libraryId && r.why) reasons[r.libraryId] = r.why
    })
    const baseRec = recommend({
      prompt: editedBrief || signature.brief,
      vibe: signature.vibe,
      audience: signature.audience,
      performance: v.mode === "performance" ? "max" : v.mode === "balanced" ? "balanced" : "rich",
      includePaid: true,
    })
    // Prefer the variant's chosen ids, falling back to LIBRARIES for any id
    // that recommend() didn't surface.
    const stackIds = v.stackIds.filter((id) =>
      LIBRARIES.find((l) => l.id === id)
    )
    const res = await saveStack({
      prompt: editedBrief || signature.brief,
      vibe: signature.vibe,
      audience: signature.audience,
      performance: v.mode === "performance" ? "max" : v.mode === "balanced" ? "balanced" : "rich",
      includePaid: true,
      headline: v.ai.headline ?? signature.vibeStatement,
      rationale: v.ai.rationale ?? "",
      stackIds,
      reasons,
      theme: v.ai.theme as Record<string, unknown>,
      impactScore: v.impactScore,
      perfBudget: baseRec.perfBudget,
      asDraft: true,
      title: v.ai.headline ?? signature.vibeStatement,
    })
    if ("error" in res) {
      setPhase("ready")
      toast.error("Couldn't save", { description: res.error })
      return
    }
    if (inspirationId) {
      await linkInspirationToStack(inspirationId, res.id).catch(() => null)
    }
    toast.success("Saved to your dashboard")
    router.push(`/s/${res.id}`)
  }

  // ---- render -----------------------------------------------------------

  if (phase === "idle") {
    return (
      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <Card
          className={cn(
            "relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden border-dashed transition",
            dragOver && "border-primary/60 bg-primary/5",
          )}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="grid h-14 w-14 place-items-center rounded-full border border-border bg-background">
            <ImagePlus className="h-6 w-6 text-primary" strokeWidth={1.6} />
          </div>
          <h2 className="mt-5 font-display text-2xl tracking-[-0.01em]">Drop an image here</h2>
          <p className="mt-2 max-w-md text-center text-sm text-muted-foreground leading-relaxed">
            PNG, JPG, or WebP up to 12 MB. Or just paste from your clipboard — it works anywhere on
            this page.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              data-cursor="hover"
            >
              <ImagePlus className="h-4 w-4" />
              Choose image
            </Button>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
              <Clipboard className="h-3.5 w-3.5" />
              Cmd-V to paste
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void submit({ file: f })
            }}
          />
        </Card>

        <Card className="flex min-h-[420px] flex-col gap-5 p-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Or paste a public URL
            </p>
            <h3 className="mt-2 font-display text-xl tracking-[-0.01em]">
              From Mobbin, Dribbble, Behance…
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              We pull the public OG-image preview that the source site already publishes for link
              previews — no scraping of authenticated feeds.
            </p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!ogUrl.trim()) return
              void submit({ ogUrl: ogUrl.trim() })
            }}
          >
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={ogUrl}
                onChange={(e) => setOgUrl(e.target.value)}
                placeholder="https://mobbin.com/…"
                className="h-11 w-full rounded-md border border-border bg-background/60 pl-10 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60"
                data-cursor="hover"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              variant="outline"
              disabled={!ogUrl.trim()}
              data-cursor="hover"
            >
              Extract
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Supported
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {listAllowedOgDomains().map((d) => (
                <span
                  key={d}
                  className="rounded-full border border-border bg-background/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
          {userEmail && (
            <p className="mt-auto text-[11px] text-muted-foreground">
              Signed in as <span className="text-foreground">{userEmail}</span>. Inspirations stay
              private until you mark them public.
            </p>
          )}
        </Card>
      </div>
    )
  }

  if (phase === "extracting") {
    return (
      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <Card className="relative aspect-[4/3] overflow-hidden">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Source"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-muted/30">
              <Link2 className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px]" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Extracting palette &amp; signature
              </span>
            </div>
          </div>
        </Card>
        <div className="flex flex-col gap-3 p-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-md border border-border bg-muted/20"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!signature) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error ?? "Something went wrong."}
      </div>
    )
  }

  // ready / saving — same layout, button enables differently
  const v0Url = signatureToV0DeepLink({ ...signature, brief: editedBrief || signature.brief })

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
      <div className="flex flex-col gap-4">
        <Card className="relative aspect-[4/3] overflow-hidden">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Inspiration source"
              className="absolute inset-0 h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-muted/30">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <button
            onClick={reset}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur transition hover:text-foreground"
            aria-label="Start over"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-2.5 py-1 backdrop-blur">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {signature.source.type === "og" ? "OG image" : "Upload"}
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <label
            htmlFor="brief"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
          >
            Brief — edit before generating
          </label>
          <textarea
            id="brief"
            value={editedBrief}
            onChange={(e) => setEditedBrief(e.target.value)}
            rows={6}
            className="mt-2 w-full resize-none rounded-md border border-border bg-background/60 p-3 text-sm leading-relaxed outline-none transition focus:border-primary/60"
            data-cursor="text"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            This brief is what gets handed to the recommender and to v0. Tighten it however you
            want.
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <SignatureCard signature={signature} />

        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <VariantPicker
              prompt={editedBrief || signature.brief}
              vibe={signature.vibe}
              audience={signature.audience}
              includePaid={true}
              onPick={handleVariantPick}
            />
            <Button
              variant="outline"
              size="lg"
              asChild
              data-cursor="hover"
              disabled={phase === "saving"}
            >
              <a href={v0Url} target="_blank" rel="noreferrer">
                Open in v0
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Pick a variant to save it as a draft on your dashboard.
          </p>
          {phase === "saving" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving…
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
