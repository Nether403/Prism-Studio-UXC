import { Suspense } from "react"
import Link from "next/link"
import { AuthShell } from "@/components/auth-shell"
import { LoginForm } from "@/components/login-form"
import { Spinner } from "@/components/ui/spinner"

export const metadata = {
  title: "Sign in · Prism",
  description: "Sign in to save stacks, fork from the gallery, and publish to your profile.",
}

export default function LoginPage() {
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
      <Suspense
        fallback={
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Spinner className="h-5 w-5" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
