"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { usePrismTheme } from "@/components/prism-theme-provider"
import { THEME_PRESETS } from "@/lib/themes"
import { RECIPES } from "@/lib/recipes"
import {
  Wand2,
  Palette,
  Layers,
  Image as ImageIcon,
  Github,
  RotateCcw,
  Sparkles,
  Shuffle,
  BookOpen,
} from "lucide-react"

type CommandPaletteProps = {
  onTriggerGenerate?: () => void
}

export function CommandPalette({ onTriggerGenerate }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { setTheme, reset } = usePrismTheme()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement | null
        const tag = target?.tagName?.toLowerCase()
        if (tag !== "input" && tag !== "textarea" && !target?.isContentEditable) {
          e.preventDefault()
          setOpen(true)
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const run = (fn: () => void) => () => {
    setOpen(false)
    setTimeout(fn, 50)
  }

  const sections: Array<{ id: string; label: string }> = [
    { id: "top", label: "Top" },
    { id: "generator", label: "Generator" },
    { id: "capabilities", label: "Capabilities" },
    { id: "libraries", label: "Library catalog" },
    { id: "integrations", label: "Integrations" },
  ]

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command — generate, theme, jump to section…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        <CommandGroup heading="Actions">
          {onTriggerGenerate && (
            <CommandItem
              onSelect={run(() => {
                document.getElementById("generator")?.scrollIntoView({ behavior: "smooth" })
                onTriggerGenerate()
              })}
            >
              <Wand2 className="h-4 w-4" />
              Compose new stack
              <CommandShortcut>G</CommandShortcut>
            </CommandItem>
          )}
          <CommandItem
            onSelect={run(() => {
              const random = THEME_PRESETS[Math.floor(Math.random() * THEME_PRESETS.length)]
              setTheme(random)
            })}
          >
            <Shuffle className="h-4 w-4" />
            Shuffle theme preset
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={run(reset)}>
            <RotateCcw className="h-4 w-4" />
            Reset to default theme
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme presets">
          {THEME_PRESETS.map((p) => (
            <CommandItem key={p.name} onSelect={run(() => setTheme(p))}>
              <span
                className="inline-block h-3 w-3 rounded-sm border border-border"
                style={{ background: p.primary }}
              />
              <span
                className="inline-block h-3 w-3 rounded-sm border border-border -ml-1.5"
                style={{ background: p.accent }}
              />
              <span className="ml-2">{p.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{p.displayFont}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {sections.map((s) => (
            <CommandItem
              key={s.id}
              onSelect={run(() =>
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" })
              )}
            >
              <Layers className="h-4 w-4" />
              {s.label}
            </CommandItem>
          ))}
          <CommandItem onSelect={run(() => router.push("/gallery"))}>
            <ImageIcon className="h-4 w-4" />
            Open public gallery
          </CommandItem>
          <CommandItem onSelect={run(() => router.push("/recipes"))}>
            <BookOpen className="h-4 w-4" />
            Browse recipes
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Recipes">
          {RECIPES.map((r) => (
            <CommandItem
              key={r.slug}
              onSelect={run(() => router.push(`/recipes/${r.slug}`))}
            >
              <span
                className="inline-block h-3 w-3 rounded-sm border border-border"
                style={{ background: r.theme.primary }}
              />
              <span
                className="inline-block h-3 w-3 rounded-sm border border-border -ml-1.5"
                style={{ background: r.theme.accent }}
              />
              <span className="ml-2">{r.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">{r.theme.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="External">
          <CommandItem onSelect={run(() => window.open("https://v0.app", "_blank"))}>
            <Sparkles className="h-4 w-4" />
            Open v0
            <CommandShortcut>↗</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={run(() => window.open("https://sdk.vercel.ai", "_blank"))}>
            <Palette className="h-4 w-4" />
            AI SDK docs
            <CommandShortcut>↗</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={run(() => window.open("https://github.com/vercel/next.js", "_blank"))}>
            <Github className="h-4 w-4" />
            Next.js GitHub
            <CommandShortcut>↗</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

/** Inline trigger button for the navbar */
export function CommandTrigger() {
  const onClick = () => {
    const event = new KeyboardEvent("keydown", { key: "k", metaKey: true })
    window.dispatchEvent(event)
  }
  return (
    <button
      onClick={onClick}
      data-cursor="hover"
      className="hidden md:inline-flex items-center gap-2 rounded-md border border-border bg-card/40 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
      aria-label="Open command palette"
    >
      <span>Search</span>
      <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] tracking-wider">⌘K</kbd>
    </button>
  )
}
