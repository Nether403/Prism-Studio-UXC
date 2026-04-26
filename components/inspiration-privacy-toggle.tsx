"use client"

// ---------------------------------------------------------------------------
// InspirationPrivacyToggle — small absolute-positioned button that flips
// inspirations.is_public via the setInspirationPublic server action.
// ---------------------------------------------------------------------------
//
// Designed to live inside <ProvenanceThumb> at top-right, on top of the
// stretched <Link> via z-20 (link is z-10). The button's onClick stops
// propagation so the surrounding card's link doesn't navigate.
//
// State model: optimistic — the icon flips immediately on click, the server
// action runs in a transition, and on error we revert and surface a toast.
// This keeps the dashboard strip feeling snappy even on a slow network.
// ---------------------------------------------------------------------------

import { useState, useTransition } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { setInspirationPublic } from "@/app/actions/inspiration"
import { cn } from "@/lib/utils"

export type InspirationPrivacyToggleProps = {
  inspirationId: string
  initialPublic: boolean
}

export function InspirationPrivacyToggle({
  inspirationId,
  initialPublic,
}: InspirationPrivacyToggleProps) {
  const [isPublic, setIsPublic] = useState(initialPublic)
  const [pending, startTransition] = useTransition()

  function onToggle(e: React.MouseEvent<HTMLButtonElement>) {
    // The thumb wraps a stretched <Link>. The button sits at z-20 above the
    // link (z-10) so the click already hits the button — but we still
    // preventDefault+stopPropagation defensively to keep keyboard activation
    // (Enter/Space → synthetic click) from bubbling.
    e.preventDefault()
    e.stopPropagation()
    if (pending) return

    const next = !isPublic
    setIsPublic(next) // optimistic flip

    startTransition(async () => {
      const res = await setInspirationPublic(inspirationId, next)
      if ("error" in res) {
        setIsPublic(!next) // revert
        toast.error("Couldn't update privacy", { description: res.error })
        return
      }
      toast.success(next ? "Capture is now public" : "Capture is now private")
    })
  }

  const Icon = pending ? Loader2 : isPublic ? Eye : EyeOff
  const label = isPublic ? "Make private" : "Make public"

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      title={label}
      aria-label={label}
      aria-pressed={isPublic}
      data-cursor="hover"
      className={cn(
        // z-20 puts this above the stretched <Link> (z-10) inside the thumb.
        "absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5",
        "bg-background/85 backdrop-blur transition hover:bg-background hover:scale-105",
        "font-mono text-[9px] uppercase tracking-wider",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isPublic ? "text-primary" : "text-muted-foreground",
        pending && "opacity-70 cursor-progress",
      )}
    >
      <Icon className={cn("h-2.5 w-2.5", pending && "animate-spin")} aria-hidden />
    </button>
  )
}
