import Link from "next/link"
import { Heart, GitFork, Save, Send, Image as ImageIcon, Repeat } from "lucide-react"

export type ActivityEvent = {
  id: number
  type:
    | "save"
    | "publish"
    | "like"
    | "fork"
    | "inspiration_publish"
    | "inspiration_cache_hit"
  created_at: string
  stack_id: string | null
  metadata: Record<string, unknown> | null
  actor: { username: string | null; display_name: string | null } | null
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ""
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return `${Math.round(diff)}s`
  if (diff < 3600) return `${Math.round(diff / 60)}m`
  if (diff < 86400) return `${Math.round(diff / 3600)}h`
  return `${Math.round(diff / 86400)}d`
}

const ICONS = {
  save: Save,
  publish: Send,
  like: Heart,
  fork: GitFork,
  inspiration_publish: ImageIcon,
  inspiration_cache_hit: Repeat,
} as const

const VERBS: Record<ActivityEvent["type"], string> = {
  save: "saved",
  publish: "published",
  like: "liked",
  fork: "forked",
  inspiration_publish: "published a capture",
  inspiration_cache_hit: "re-used a capture from",
}

export function ActivityFeed({
  events,
  emptyLabel = "No activity yet.",
  showActor = true,
}: {
  events: ActivityEvent[]
  emptyLabel?: string
  showActor?: boolean
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-muted/20">
      {events.map((e) => {
        const Icon = ICONS[e.type] ?? Save
        const actorName =
          e.actor?.display_name?.trim() ||
          e.actor?.username ||
          "someone"
        const isInspiration =
          e.type === "inspiration_publish" || e.type === "inspiration_cache_hit"

        // For stack events the noun is the stack headline ("liked Studio
        // Sienna"). For inspiration events it's the captured source — a
        // hostname for URLs, "image" for uploads — so the row reads
        // "@alex re-used a capture from mobbin.com".
        const objectLabel = isInspiration
          ? inspirationLabel(e.metadata)
          : (typeof (e.metadata as { headline?: unknown } | null)?.headline === "string"
              ? ((e.metadata as { headline: string }).headline as string)
              : "a stack")

        // Stack events still link to /s/<id>. Inspiration events link to
        // their generated stack (via stack_id) when present, otherwise
        // they're just text — captures without a saved stack don't have
        // a public surface to point at.
        const objectHref = e.stack_id ? `/s/${e.stack_id}` : null

        return (
          <li key={e.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background text-muted-foreground"
              aria-hidden
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate">
                {showActor && (
                  <>
                    {e.actor?.username ? (
                      <Link
                        href={`/u/${e.actor.username}`}
                        className="font-medium hover:underline"
                        data-cursor="hover"
                      >
                        {actorName}
                      </Link>
                    ) : (
                      <span className="font-medium">{actorName}</span>
                    )}{" "}
                  </>
                )}
                <span className="text-muted-foreground">{VERBS[e.type]} </span>
                {objectHref ? (
                  <Link
                    href={objectHref}
                    className="hover:underline"
                    data-cursor="hover"
                  >
                    {objectLabel}
                  </Link>
                ) : (
                  <span>{objectLabel}</span>
                )}
              </p>
            </div>
            <time
              dateTime={e.created_at}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              {timeAgo(e.created_at)}
            </time>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Render a short, human-friendly label for an inspiration event. URL
 * captures collapse to a hostname; image uploads render as "an image" so
 * we never leak a private blob path or filename into the public feed.
 */
function inspirationLabel(metadata: Record<string, unknown> | null): string {
  const sourceType =
    typeof metadata?.source_type === "string" ? (metadata.source_type as string) : null
  const sourceRef =
    typeof metadata?.source_ref === "string" ? (metadata.source_ref as string) : null

  if (sourceType === "url" || sourceType === "og") {
    if (!sourceRef) return "a website"
    try {
      return new URL(sourceRef).hostname.replace(/^www\./, "")
    } catch {
      return "a website"
    }
  }
  if (sourceType === "image") return "an image"
  return "a capture"
}
