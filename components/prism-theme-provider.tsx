"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  applyTheme as applyThemeToDoc,
  DEFAULT_THEME,
  resetTheme as resetThemeOnDoc,
  type Theme,
} from "@/lib/themes"

type PrismThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  reset: () => void
  isCustom: boolean
}

const PrismThemeContext = createContext<PrismThemeContextValue | null>(null)

const STORAGE_KEY = "prism:theme"

export function PrismThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Theme
        if (parsed && parsed.background) {
          setThemeState(parsed)
          applyThemeToDoc(parsed)
        }
      }
    } catch {}
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyThemeToDoc(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }, [])

  const reset = useCallback(() => {
    setThemeState(DEFAULT_THEME)
    resetThemeOnDoc()
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [])

  const value = useMemo<PrismThemeContextValue>(
    () => ({
      theme,
      setTheme,
      reset,
      isCustom: theme.name !== DEFAULT_THEME.name,
    }),
    [theme, setTheme, reset]
  )

  return <PrismThemeContext.Provider value={value}>{children}</PrismThemeContext.Provider>
}

export function usePrismTheme() {
  const ctx = useContext(PrismThemeContext)
  if (!ctx) throw new Error("usePrismTheme must be used within PrismThemeProvider")
  return ctx
}
