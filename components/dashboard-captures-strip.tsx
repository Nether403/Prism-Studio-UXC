"use client"

// ---------------------------------------------------------------------------
// DashboardCapturesStrip — owner-side wrapper around <ProvenanceStrip>.
// ---------------------------------------------------------------------------
//
// The shared <ProvenanceStrip /> server component handles read-only and
// editable rendering for both /dashboard and /u/[username]. The dashboard
// has one extra concern, though: the owner often wants to flip privacy on
// many captures at once ("publish my last batch", "make all old captures
// private"). Rather than firing N parallel single-row PATCHes, we add a
// "Manage" mode that:
//
//   • Replaces each thumb's behaviour with a select-toggle (delegated to
//     <ProvenanceThumb selection={…} />).
//   • Surfaces a sticky toolbar with Select-all / Clear / Make public /
//     Make private actions, dispatched in a single server action call.
//
// We deliberately reuse <ProvenanceThumb> rather than duplicating its
// markup so visual changes (variant rails, palette gradients, etc.) stay
// consistent with the read-only and profile views automatically.
// ---------------------------------------------------------------------------

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckSquare, Eye, EyeOff, GitBranch, ListChecks, Square, X } from "lucide-react"
import { toast } from "sonner"
import {
  ProvenanceStrip,
  ProvenanceThumb,
  groupInspirationsByLineage,
  type ProvenanceInspiration,
} from "@/components/provenance-thumb"
import { setInspirationsPublicBulk } from "@/app/actions/inspiration"
import { Button } from "@/components/ui/button"

export function DashboardCapturesStrip({
  inspirations,
  stacksById,
}: {
  inspirations: ProvenanceInspiration[]
  stacksById: Record<string, { title: string | null; headline: string }>
}) {
  const router = useRouter()
  const [manage, setManage] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [pending, startTransition] = useTransition()

  // Lineage-ordered items. Memoized so toggling selection state doesn't
  // re-run the grouping work — the inspirations array is stable across
  // renders (the dashboard refetches on revalidation, not on local state
  // changes).
  const { ordered, variantTotal } = useMemo(
    () => groupInspirationsByLineage(inspirations),
    [inspirations],
  )

  // Pre-compute the public/private split once per render so toolbar copy
  // can show "3 to publish · 1 already public" instead of guessing.
  const selectedSplit = useMemo(() => {
    if (selected.size === 0) return { selectedPublic: 0, selectedPrivate: 0 }
    let publicCount = 0
    let privateCount = 0
    for (const insp of inspirations) {
      if (!selected.has(insp.id)) continue
      if (insp.is_public) publicCount++
      else privateCount++
    }
    return { selectedPublic: publicCount, selectedPrivate: privateCount }
  }, [inspirations, selected])

  if (inspirations.length === 0) return null

  // Read-only path → delegate entirely to the shared strip with editable
  // toggles enabled. The dashboard always wants per-row toggles when not
  // in batch-manage mode.
  if (!manage) {
    return (
      <section aria-labelledby="captures-strip-heading" className="space-y-4">
        <header className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span className="text-primary">I</span>
          <span className="h-px w-8 bg-border" />
          <span id="captures-strip-heading">Captures</span>
          <span className="text-foreground/70 tabular-nums normal-case">
            {inspirations.length}
          </span>
          {variantTotal > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/40 px-2 py-0.5 normal-case tracking-wider text-muted-foreground">
              <GitBranch className="h-2.5 w-2.5" aria-hidden />
              <span className="tabular-nums text-foreground/80">{variantTotal}</span>
              <span>variant{variantTotal === 1 ? "" : "s"}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setManage(true)}
            data-cursor="hover"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-2.5 py-1 normal-case tracking-wider text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
          >
            <ListChecks className="h-3 w-3" aria-hidden />
            Manage privacy
          </button>
        </header>

        <StripBody
          ordered={ordered}
          stacksById={stacksById}
          editable
          selected={null}
          onToggle={null}
        />
      </section>
    )
  }

  // ---- Manage mode ------------------------------------------------------

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(inspirations.map((i) => i.id)))
  }

  function clearAll() {
    setSelected(new Set())
  }

  function exitManage() {
    setManage(false)
    setSelected(new Set())
  }

  function applyBulk(isPublic: boolean) {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    startTransition(async () => {
      const res = await setInspirationsPublicBulk(ids, isPublic)
      if ("error" in res) {
        toast.error("Couldn't update captures", { description: res.error })
        return
      }
      toast.success(
        isPublic
          ? `${res.updated} ${res.updated === 1 ? "capture" : "captures"} published`
          : `${res.updated} ${res.updated === 1 ? "capture" : "captures"} made private`,
      )
      setSelected(new Set())
      setManage(false)
      router.refresh()
    })
  }

  const allSelected = selected.size === inspirations.length
  const { selectedPublic, selectedPrivate } = selectedSplit

  return (
    <section aria-labelledby="captures-strip-heading" className="space-y-4">
      <header className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <span className="text-primary">I</span>
        <span className="h-px w-8 bg-border" />
        <span id="captures-strip-heading">Captures</span>
        <span className="text-foreground/70 tabular-nums normal-case">
          {inspirations.length}
        </span>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 normal-case tracking-wider text-primary">
          Manage
        </span>
        <button
          type="button"
          onClick={exitManage}
          disabled={pending}
          data-cursor="hover"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-2.5 py-1 normal-case tracking-wider text-muted-foreground transition hover:border-foreground/30 hover:text-foreground disabled:opacity-60"
        >
          <X className="h-3 w-3" aria-hidden />
          Done
        </button>
      </header>

      <StripBody
        ordered={ordered}
        stacksById={stacksById}
        editable={false}
        selected={selected}
        onToggle={toggle}
      />

      {/*
        Bulk action toolbar. We render it inline (rather than fixed at the
        bottom of the viewport) so it sits immediately under the strip on
        every viewport size. The buttons are split into select-shape vs
        privacy-shape actions so a user can always read state out of the
        toolbar even with zero selection.
      */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/40 p-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {selected.size === 0
            ? "Select captures to publish or hide"
            : `${selected.size} selected${
                selected.size > 0
                  ? ` · ${selectedPrivate} private · ${selectedPublic} public`
                  : ""
              }`}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={allSelected ? clearAll : selectAll}
            disabled={pending}
            data-cursor="hover"
          >
            {allSelected ? (
              <>
                <Square className="h-3.5 w-3.5" />
                Clear
              </>
            ) : (
              <>
                <CheckSquare className="h-3.5 w-3.5" />
                Select all
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => applyBulk(true)}
            disabled={pending || selectedPrivate === 0}
            data-cursor="hover"
            title={
              selectedPrivate === 0
                ? "All selected captures are already public"
                : `Publish ${selectedPrivate} private capture${selectedPrivate === 1 ? "" : "s"}`
            }
          >
            <Eye className="h-3.5 w-3.5" />
            Make public
            {selectedPrivate > 0 && (
              <span className="font-mono text-[10px] tabular-nums">{selectedPrivate}</span>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => applyBulk(false)}
            disabled={pending || selectedPublic === 0}
            data-cursor="hover"
            title={
              selectedPublic === 0
                ? "All selected captures are already private"
                : `Make ${selectedPublic} public capture${selectedPublic === 1 ? "" : "s"} private`
            }
          >
            <EyeOff className="h-3.5 w-3.5" />
            Make private
            {selectedPublic > 0 && (
              <span className="font-mono text-[10px] tabular-nums">{selectedPublic}</span>
            )}
          </Button>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Internal renderer: shared between read-only and manage modes so we don't
// duplicate the scroller markup. When `editable` is true and `selected` is
// null, this is identical to <ProvenanceStrip editable />. When selected is
// a Set, every thumb opts into selection mode.
// ---------------------------------------------------------------------------

function StripBody({
  ordered,
  stacksById,
  editable,
  selected,
  onToggle,
}: {
  ordered: ReturnType<typeof groupInspirationsByLineage>["ordered"]
  stacksById: Record<string, { title: string | null; headline: string }>
  editable: boolean
  selected: Set<string> | null
  onToggle: ((id: string) => void) | null
}) {
  // Read-only path: we can fall through to the shared <ProvenanceStrip>
  // because the visual grouping and DOM are exactly what we want. We re-
  // build the flat array from ordered items so the strip's own grouping
  // pass is a no-op (no-cost; idempotent on already-grouped input).
  if (selected === null) {
    return (
      <ProvenanceStrip
        inspirations={ordered.map((o) => o.insp)}
        stacksById={stacksById}
        editable={editable}
      />
    )
  }

  // Manage path: render the same scroller manually so we can pass a
  // `selection` prop into each thumb. We can't go through <ProvenanceStrip>
  // for this because the shared component intentionally doesn't know about
  // selection (that's a dashboard-only concept).
  return (
    <div
      className="-mx-6 overflow-x-auto px-6 pb-2 [scrollbar-width:thin] snap-x snap-mandatory"
      role="list"
    >
      <ul className="flex gap-3 w-max items-start">
        {ordered.map(({ insp, variantOf }) => (
          <li key={insp.id} className="snap-start" role="listitem">
            <ProvenanceThumb
              inspiration={insp}
              linkedStack={
                insp.generated_stack_id ? stacksById[insp.generated_stack_id] ?? null : null
              }
              editable={false}
              variantOf={variantOf}
              selection={{
                selected: selected.has(insp.id),
                onToggle: () => onToggle?.(insp.id),
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
