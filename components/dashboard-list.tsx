"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  GitFork,
  ExternalLink,
  Pencil as PencilIcon,
  Heart,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { toast } from "sonner"
import { renameStack, setPublished, deleteStack, forkStack } from "@/app/actions/stack"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { Theme } from "@/lib/themes"

type Row = {
  id: string
  title: string | null
  headline: string
  prompt: string
  vibe: string
  audience: string
  published: boolean
  parent_id: string | null
  fork_count: number
  likes: number
  views: number
  stack_ids: string[]
  theme: Theme | null
  impact_score: number
  perf_budget: number
  created_at: string
  updated_at: string
}

export function DashboardList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Empty className="border-2 border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Activity className="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>No stacks yet</EmptyTitle>
          <EmptyDescription>
            Generate one from the studio and it&apos;ll show up here as a draft.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/#generator">Generate your first stack</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <ul className="grid gap-4">
      {rows.map((r) => (
        <Item key={r.id} row={r} />
      ))}
    </ul>
  )
}

function Item({ row }: { row: Row }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(row.title ?? row.headline ?? "")
  const [pending, startTransition] = useTransition()

  const visibleTitle = row.title || row.headline || "Untitled"
  const updated = new Date(row.updated_at)
  const updatedLabel = formatRelative(updated)

  function commitRename() {
    const next = titleDraft.trim()
    if (!next || next === (row.title ?? row.headline)) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      const res = await renameStack(row.id, next)
      if ("error" in res) toast.error(res.error)
      else toast.success("Renamed")
      setEditing(false)
      router.refresh()
    })
  }

  function togglePublish() {
    startTransition(async () => {
      const res = await setPublished(row.id, !row.published)
      if ("error" in res) toast.error(res.error)
      else toast.success(row.published ? "Moved to drafts" : "Published to gallery")
      router.refresh()
    })
  }

  function handleFork() {
    startTransition(async () => {
      const res = await forkStack(row.id, `Fork of ${visibleTitle}`)
      if ("id" in res) {
        toast.success("Forked")
        router.push(`/dashboard/edit/${res.id}`)
      } else {
        toast.error(res.error)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteStack(row.id)
      if ("error" in res) toast.error(res.error)
      else toast.success("Deleted")
      router.refresh()
    })
  }

  return (
    <li
      className="group rounded-lg border border-border bg-card/40 p-5 transition hover:border-foreground/20"
      data-cursor="hover"
    >
      <div className="flex flex-wrap items-start gap-5">
        {/* Theme swatch */}
        <div
          className="h-20 w-28 shrink-0 rounded-md border border-border overflow-hidden grid grid-cols-4"
          style={{ background: row.theme?.background ?? "var(--card)" }}
          aria-hidden
        >
          {[row.theme?.background, row.theme?.foreground, row.theme?.accent, row.theme?.primary].map(
            (c, i) => (
              <div key={i} style={{ background: c ?? "transparent" }} />
            ),
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>/{row.id}</span>
            {row.parent_id && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <GitFork className="h-3 w-3" />
                  forked
                </span>
              </>
            )}
            <span>·</span>
            <span>{row.vibe}</span>
            <span>·</span>
            <span>{row.audience}</span>
            <span>·</span>
            <span>{updatedLabel}</span>
          </div>

          {editing ? (
            <div className="mt-2 flex items-center gap-2">
              <Input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename()
                  if (e.key === "Escape") {
                    setTitleDraft(row.title ?? row.headline ?? "")
                    setEditing(false)
                  }
                }}
                onBlur={commitRename}
                className="h-9 text-base"
              />
            </div>
          ) : (
            <h3 className="mt-2 font-display text-2xl tracking-tight leading-tight">
              {visibleTitle}
            </h3>
          )}

          <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            {row.prompt}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span className="tabular-nums">{row.likes}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <GitFork className="h-3 w-3" />
              <span className="tabular-nums">{row.fork_count}</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider">
              {row.stack_ids.length} libs
            </span>
            <span
              className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                row.published
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  row.published ? "bg-primary" : "bg-muted-foreground/60"
                }`}
              />
              {row.published ? "Published" : "Draft"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        <Button asChild size="sm" variant="default" className="gap-2">
          <Link href={`/dashboard/edit/${row.id}`}>
            <PencilIcon className="h-3.5 w-3.5" />
            Edit & regenerate
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link href={`/s/${row.id}`}>
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => setEditing(true)}
          disabled={pending}
        >
          <Pencil className="h-3.5 w-3.5" />
          Rename
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={togglePublish}
          disabled={pending}
        >
          {row.published ? (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              Unpublish
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              Publish
            </>
          )}
        </Button>
        <Button size="sm" variant="ghost" className="gap-2" onClick={handleFork} disabled={pending}>
          <GitFork className="h-3.5 w-3.5" />
          Duplicate
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto gap-2 text-muted-foreground hover:text-destructive"
              disabled={pending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this stack?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes <span className="font-medium">{visibleTitle}</span>{" "}
                and any likes or forks attached to it. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  )
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
