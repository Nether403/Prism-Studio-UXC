"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Save, RefreshCw, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { recommend } from "@/lib/recommend"
import type { Vibe, Audience, Performance } from "@/lib/recommend"
import { LIBRARIES } from "@/lib/stack-data"
import { type Theme } from "@/lib/themes"
import { PreviewPane } from "@/components/preview-pane"
import { updateStack, deleteStack, setPublished } from "@/app/actions/stack"
import { ExportActions } from "@/components/export-actions"

type Row = {
  id: string
  title: string | null
  prompt: string
  vibe: string
  audience: string
  performance: string
  include_paid: boolean
  headline: string
  rationale: string | null
  stack_ids: string[]
  reasons: Record<string, string>
  theme: Theme
  impact_score: number
  perf_budget: number
  published: boolean
}

const VIBES: Vibe[] = ["minimal", "bold", "editorial", "playful", "experimental"]
const AUDIENCES: Audience[] = ["consumer", "enterprise", "developer", "creative"]
const PERFS: Performance[] = ["max", "balanced", "rich"]

export function EditWorkbench({ row }: { row: Row }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [regenPending, startRegen] = useTransition()

  // Editable fields
  const [title, setTitle] = useState(row.title ?? row.headline)
  const [prompt, setPrompt] = useState(row.prompt)
  const [vibe, setVibe] = useState<Vibe>(row.vibe as Vibe)
  const [audience, setAudience] = useState<Audience>(row.audience as Audience)
  const [performance, setPerformance] = useState<Performance>(row.performance as Performance)
  const [includePaid, setIncludePaid] = useState(row.include_paid)
  const [headline, setHeadline] = useState(row.headline)
  const [rationale, setRationale] = useState(row.rationale ?? "")
  const [theme, setTheme] = useState<Theme>(row.theme)
  const [stackIds, setStackIds] = useState<string[]>(row.stack_ids ?? [])

  // Recompute scores from current stackIds + input
  const recommendation = useMemo(() => {
    return recommend({ prompt, vibe, audience, performance, includePaid })
  }, [prompt, vibe, audience, performance, includePaid])

  // Allowable libs respecting includePaid + auth
  const availableLibs = useMemo(
    () => LIBRARIES.filter((l) => (includePaid ? true : l.tier === "free")),
    [includePaid],
  )

  function toggleLib(id: string) {
    setStackIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSave() {
    startTransition(async () => {
      const res = await updateStack(row.id, {
        title: title.trim() || row.headline,
        prompt,
        vibe,
        audience,
        performance,
        include_paid: includePaid,
        headline,
        rationale,
        stack_ids: stackIds,
        theme,
        impact_score: recommendation.impactScore,
        perf_budget: recommendation.perfBudget,
      })
      if ("error" in res) toast.error(res.error)
      else toast.success("Saved", { description: "Your changes are live." })
    })
  }

  async function handleRegenerate() {
    startRegen(async () => {
      try {
        const res = await fetch("/api/regenerate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt,
            vibe,
            audience,
            performance,
            includePaid,
            stackIds,
          }),
        })
        if (!res.ok) throw new Error("Generation failed")
        const data = (await res.json()) as {
          headline?: string
          rationale?: string
          theme?: Partial<Theme>
        }
        if (data.headline) setHeadline(data.headline)
        if (data.rationale) setRationale(data.rationale)
        if (data.theme) setTheme((t) => ({ ...t, ...data.theme }))
        toast.success("Regenerated", { description: "AI rewrote the copy and theme." })
      } catch (e) {
        toast.error("Regenerate failed", {
          description: e instanceof Error ? e.message : "Try again in a moment.",
        })
      }
    })
  }

  function handleTogglePublish() {
    startTransition(async () => {
      const res = await setPublished(row.id, !row.published)
      if ("error" in res) toast.error(res.error)
      else {
        toast.success(row.published ? "Moved to drafts" : "Published")
        router.refresh()
      }
    })
  }

  function handleDelete() {
    if (!confirm("Delete this stack permanently?")) return
    startTransition(async () => {
      const res = await deleteStack(row.id)
      if ("error" in res) toast.error(res.error)
      else router.push("/dashboard")
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Left — controls */}
      <div className="space-y-8 lg:col-span-5">
        <Section index="01" label="Identity">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.25em]">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.25em]">Brief</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
        </Section>

        <Section index="02" label="Direction">
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Vibe" value={vibe} onChange={(v) => setVibe(v as Vibe)} options={VIBES} />
            <SelectField
              label="Audience"
              value={audience}
              onChange={(v) => setAudience(v as Audience)}
              options={AUDIENCES}
            />
            <SelectField
              label="Performance"
              value={performance}
              onChange={(v) => setPerformance(v as Performance)}
              options={PERFS}
            />
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Paid libs
                </div>
                <div className="text-sm">{includePaid ? "Allowed" : "Free only"}</div>
              </div>
              <Switch checked={includePaid} onCheckedChange={setIncludePaid} />
            </div>
          </div>
        </Section>

        <Section index="03" label="Copy">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.25em]">Headline</Label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.25em]">Rationale</Label>
              <Textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenPending}
              className="gap-2"
              data-cursor="hover"
            >
              {regenPending ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Regenerate copy & theme with AI
            </Button>
          </div>
        </Section>

        <Section index="04" label="Theme tokens">
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["name", "Name"],
                ["motto", "Motto"],
                ["displayFont", "Display"],
                ["bodyFont", "Body"],
                ["radius", "Radius"],
                ["primary", "Primary"],
                ["accent", "Accent"],
                ["background", "Background"],
                ["foreground", "Foreground"],
                ["card", "Card"],
                ["muted", "Muted"],
                ["border", "Border"],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase tracking-[0.25em]">{label}</Label>
                <Input
                  value={(theme[k as keyof Theme] as string | undefined) ?? ""}
                  onChange={(e) => setTheme((t) => ({ ...t, [k]: e.target.value }))}
                  className="h-9 font-mono text-xs"
                />
              </div>
            ))}
          </div>
        </Section>

        <Section index="05" label="Libraries">
          <div className="grid grid-cols-2 gap-2">
            {availableLibs.map((lib) => {
              const on = stackIds.includes(lib.id)
              return (
                <button
                  key={lib.id}
                  type="button"
                  onClick={() => toggleLib(lib.id)}
                  className={`text-left rounded-md border px-3 py-2 transition ${
                    on
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card/40 hover:border-foreground/30"
                  }`}
                  data-cursor="hover"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{lib.name}</div>
                    <span
                      className={`h-2 w-2 rounded-full ${on ? "bg-primary" : "bg-muted-foreground/40"}`}
                    />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                    {lib.category}
                    {lib.tier !== "free" ? ` · ${lib.tier}` : ""}
                  </div>
                </button>
              )
            })}
          </div>
        </Section>
      </div>

      {/* Right — preview + actions */}
      <div className="space-y-6 lg:col-span-7">
        <div className="sticky top-24 space-y-6">
          <div className="rounded-lg border border-border bg-card/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Live preview
                </div>
                <h2 className="mt-1 font-display text-xl tracking-tight line-clamp-1">
                  {headline || "Your headline"}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTogglePublish}
                  disabled={pending}
                  className="gap-2"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {row.published ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={pending} className="gap-2">
                  {pending ? <Spinner className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </Button>
              </div>
            </div>
          </div>

          <PreviewPane
            theme={theme}
            stackIds={stackIds}
            brandName={theme.name || title || "Studio"}
          />

          <ExportActions
            input={{
              headline,
              rationale,
              brief: prompt,
              vibe,
              audience,
              theme,
              reasons: row.reasons ?? {},
              stack: stackIds
                .map((id) => LIBRARIES.find((l) => l.id === id))
                .filter((l): l is (typeof LIBRARIES)[number] => Boolean(l))
                .map((l) => ({
                  id: l.id,
                  name: l.name,
                  category: l.category,
                  tagline: l.tagline,
                  url: l.url,
                })),
            }}
            ready={true}
          />

          <div className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-4">
            <div className="flex items-center gap-3">
              <Button asChild size="sm" variant="ghost" className="gap-2">
                <a href={`/s/${row.id}`} target="_blank" rel="noreferrer">
                  Public view <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={pending}
              className="gap-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  index,
  label,
  children,
}: {
  index: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <span className="text-primary">{index}</span>
        <span className="h-px w-6 bg-border" />
        <span>{label}</span>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  return (
    <div className="space-y-2">
      <Label className="font-mono text-[10px] uppercase tracking-[0.25em]">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="capitalize">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
