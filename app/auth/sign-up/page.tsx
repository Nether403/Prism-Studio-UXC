"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export default function SignUpPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState("")
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
          data: { display_name: displayName || undefined },
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      index="02"
      eyebrow="Create account"
      title="Start your studio."
      subtitle="Save every stack you generate, fork the gallery, theme any page in a click. Free, no credit card."
      footer={
        <span>
          Already have one?{" "}
          <Link href="/auth/login" className="text-foreground underline" data-cursor="hover">
            Sign in
          </Link>
          .
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6" data-cursor="hover">
        <div className="space-y-2">
          <Label htmlFor="displayName" className="font-mono text-[10px] uppercase tracking-[0.25em]">
            Display name <span className="text-muted-foreground/60 normal-case">(optional)</span>
          </Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ada Lovelace"
            autoComplete="name"
            className="h-11"
          />
        </div>
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
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-11"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full font-medium" disabled={loading}>
          {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
          {loading ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-xs text-muted-foreground leading-relaxed">
          By signing up you agree to keep things kind and creative. We&apos;ll send a confirmation
          link to your email.
        </p>
      </form>
    </AuthShell>
  )
}
