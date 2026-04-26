"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { CommandTrigger } from "@/components/command-palette"

export function NavShell({ authSlot }: { authSlot: ReactNode }) {
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
        <Link href="/" className="flex items-center gap-2.5 group" data-cursor="hover">
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="absolute inset-0 rounded-md bg-primary blur-md opacity-50 group-hover:opacity-80 transition" />
            <Sparkles className="relative h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-mono text-sm tracking-tight">
            PRISM<span className="text-muted-foreground">/</span>STUDIO
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="/#generator" className="hover:text-foreground transition" data-cursor="hover">
            Generator
          </Link>
          <Link
            href="/from-image"
            className="hover:text-foreground transition"
            data-cursor="hover"
          >
            From image
          </Link>
          <Link href="/recipes" className="hover:text-foreground transition" data-cursor="hover">
            Recipes
          </Link>
          <Link href="/gallery" className="hover:text-foreground transition" data-cursor="hover">
            Gallery
          </Link>
          <Link href="/library" className="hover:text-foreground transition" data-cursor="hover">
            Library
          </Link>
          <Link href="/about" className="hover:text-foreground transition" data-cursor="hover">
            About
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <CommandTrigger />
          {authSlot}
        </div>
      </div>
    </header>
  )
}
