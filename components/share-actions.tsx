"use client"

import { useState, useTransition } from "react"
import { Heart, Palette, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { likeStack } from "@/app/actions/stack"
import { usePrismTheme } from "@/components/prism-theme-provider"
import { DEFAULT_THEME, type Theme } from "@/lib/themes"

export function ShareActions({
  id,
  likes: initialLikes,
  theme,
}: {
  id: string
  likes: number
  theme: Theme | null | undefined
}) {
  const { setTheme } = usePrismTheme()
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleLike() {
    if (liked || pending) return
    setLiked(true)
    setLikes((n) => n + 1) // optimistic
    startTransition(async () => {
      const res = await likeStack(id)
      if ("likes" in res) {
        setLikes(res.likes)
      } else {
        setLiked(false)
        setLikes((n) => Math.max(0, n - 1))
        toast.error("Could not like — try again")
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleLike}
        disabled={liked}
        className="gap-2"
        data-cursor="hover"
      >
        <Heart className={liked ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4"} />
        <span className="tabular-nums">{likes}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {liked ? "thanks" : "like"}
        </span>
      </Button>

      <Button size="sm" onClick={handleApply} className="gap-2" data-cursor="hover">
        <Palette className="h-4 w-4" />
        Apply this theme
      </Button>

      <Button size="sm" variant="ghost" onClick={handleCopy} className="gap-2">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  )
}
