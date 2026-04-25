"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Heart, Palette, Copy, Check, GitFork } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { toggleLike, forkStack } from "@/app/actions/stack"
import { usePrismTheme } from "@/components/prism-theme-provider"
import { DEFAULT_THEME, type Theme } from "@/lib/themes"

export function ShareActions({
  id,
  likes: initialLikes,
  initiallyLiked,
  theme,
  isAuthed,
}: {
  id: string
  likes: number
  initiallyLiked: boolean
  theme: Theme | null | undefined
  isAuthed: boolean
}) {
  const router = useRouter()
  const { setTheme } = usePrismTheme()
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(initiallyLiked)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()
  const [forking, startFork] = useTransition()

  function handleLike() {
    if (!isAuthed) {
      toast.message("Sign in to like stacks", {
        action: { label: "Sign in", onClick: () => router.push("/auth/login") },
      })
      return
    }
    if (pending) return
    // Optimistic
    const next = !liked
    setLiked(next)
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)))
    startTransition(async () => {
      const res = await toggleLike(id)
      if ("likes" in res) {
        setLikes(res.likes)
        setLiked(res.liked)
      } else {
        // rollback
        setLiked(!next)
        setLikes((n) => Math.max(0, n + (next ? -1 : 1)))
        toast.error(res.error)
      }
    })
  }

  function handleApply() {
    const t: Theme = { ...DEFAULT_THEME, ...(theme ?? {}) }
    setTheme(t)
    toast.success(`Applied "${t.name ?? "theme"}"`, {
      description: "Page re-themed with this saved palette.",
    })
  }

  function handleCopy() {
    const url = typeof window !== "undefined" ? window.location.href : ""
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast.success("Share link copied")
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleFork() {
    if (!isAuthed) {
      toast.message("Sign in to fork", {
        action: { label: "Sign in", onClick: () => router.push("/auth/login") },
      })
      return
    }
    startFork(async () => {
      const res = await forkStack(id)
      if ("id" in res) {
        toast.success("Forked to your drafts")
        router.push(`/dashboard/edit/${res.id}`)
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleLike}
        className="gap-2"
        data-cursor="hover"
        aria-pressed={liked}
      >
        <Heart className={liked ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4"} />
        <span className="tabular-nums">{likes}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {liked ? "liked" : "like"}
        </span>
      </Button>

      <Button size="sm" onClick={handleApply} className="gap-2" data-cursor="hover">
        <Palette className="h-4 w-4" />
        Apply this theme
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={handleFork}
        disabled={forking}
        className="gap-2"
        data-cursor="hover"
      >
        <GitFork className="h-4 w-4" />
        {forking ? "Forking…" : "Fork"}
      </Button>

      <Button size="sm" variant="ghost" onClick={handleCopy} className="gap-2">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  )
}
