import Link from "next/link"
import { AuthShell } from "@/components/auth-shell"
import { Mail } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <AuthShell
      index="02"
      eyebrow="Check your email"
      title="Confirmation sent."
      subtitle="Click the link in the email to verify your account, then come back to start saving stacks."
      footer={
        <span>
          Wrong email?{" "}
          <Link href="/auth/sign-up" className="text-foreground underline" data-cursor="hover">
            Try again
          </Link>
          .
        </span>
      }
    >
      <div className="flex flex-col items-start gap-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            We just sent a confirmation link to your inbox. The link is valid for 24 hours.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Once confirmed, you&apos;ll be redirected to your dashboard automatically.
          </p>
        </div>
        <Link
          href="/auth/login"
          className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary underline-offset-4 hover:underline"
          data-cursor="hover"
        >
          → Already confirmed? Sign in
        </Link>
      </div>
    </AuthShell>
  )
}
