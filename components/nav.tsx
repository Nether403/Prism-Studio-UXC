"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { CommandTrigger } from "@/components/command-palette"

export function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-border/60 bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5 group">
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="absolute inset-0 rounded-md bg-primary blur-md opacity-50 group-hover:opacity-80 transition" />
            <Sparkles className="relative h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-mono text-sm tracking-tight">
            PRISM<span className="text-muted-foreground">/</span>STUDIO
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#generator" className="hover:text-foreground transition" data-cursor="hover">
            Generator
          </a>
          <a href="#libraries" className="hover:text-foreground transition" data-cursor="hover">
            Libraries
          </a>
          <a href="#integrations" className="hover:text-foreground transition" data-cursor="hover">
            Integrations
          </a>
          <Link href="/gallery" className="hover:text-foreground transition" data-cursor="hover">
            Gallery
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <CommandTrigger />
          <Button size="sm" className="font-medium" data-cursor="hover">
            Launch studio
          </Button>
        </div>
      </div>
    </header>
  )
}
