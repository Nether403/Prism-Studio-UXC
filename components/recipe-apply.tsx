"use client"

import { Button } from "@/components/ui/button"
import { usePrismTheme } from "@/components/prism-theme-provider"
import { type Theme } from "@/lib/themes"
import { Palette, RotateCcw } from "lucide-react"
import { toast } from "sonner"

export function RecipeApply({ theme }: { theme: Theme }) {
  const { setTheme, reset } = usePrismTheme()

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        className="rounded-full"
        data-cursor="hover"
        onClick={() => {
          setTheme(theme)
          toast.success(`Applied "${theme.name}"`, {
            description: "Theme is live across the site.",
          })
        }}
      >
        <Palette className="mr-2 h-3 w-3" />
        Apply this theme
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="rounded-full text-muted-foreground hover:text-foreground"
        data-cursor="hover"
        onClick={() => {
          reset()
          toast.success("Theme reset")
        }}
      >
        <RotateCcw className="mr-2 h-3 w-3" />
        Reset
      </Button>
    </div>
  )
}
