"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push(next)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      index="01"
      eyebrow="Sign in"
      title="Welcome back."
      subtitle="Pick up exactly where you left off — your saved stacks, themes, and forks are waiting."
      footer={
        <span>
          New here?{" "}
          <Link href="/auth/sign-up" className="text-foreground underline" data-cursor="hover">
            Create an account
          </Link>
          .
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6" data-cursor="hover">
        <div className="space-y-2">
          <Label htmlFor="email" className="font-mono text-[10px] uppercase tracking-[0.25em]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.com"
            required
            autoComplete="email"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="font-mono text-[10px] uppercase tracking-[0.25em]">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className="h-11"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full font-medium" disabled={loading}>
          {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  )
}
