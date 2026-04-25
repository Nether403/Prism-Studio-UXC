import Link from "next/link"
import { Heart, GitFork, Save, Send } from "lucide-react"

export type ActivityEvent = {
  id: number
  type: "save" | "publish" | "like" | "fork"
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
} as const

const VERBS: Record<ActivityEvent["type"], string> = {
  save: "saved",
  publish: "published",
  like: "liked",
  fork: "forked",
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
        const headline =
          (e.metadata && typeof (e.metadata as { headline?: unknown }).headline === "string"
            ? ((e.metadata as { headline: string }).headline as string)
            : null) ?? "a stack"
        const actorName =
          e.actor?.display_name?.trim() ||
          e.actor?.username ||
          "someone"
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
                {e.stack_id ? (
                  <Link
                    href={`/s/${e.stack_id}`}
                    className="hover:underline"
                    data-cursor="hover"
                  >
                    {headline}
                  </Link>
                ) : (
                  <span>{headline}</span>
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
