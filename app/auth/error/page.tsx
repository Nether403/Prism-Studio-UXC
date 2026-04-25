import Link from "next/link"
import { AuthShell } from "@/components/auth-shell"
import { AlertTriangle } from "lucide-react"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  return (
    <AuthShell
      index="ERR"
      eyebrow="Something went wrong"
      title="Auth hiccup."
      subtitle="We couldn't complete your request. The most common cause is an expired link — try signing in again."
      footer={
        <span>
          <Link href="/auth/login" className="text-foreground underline" data-cursor="hover">
            ← Back to sign in
          </Link>
        </span>
      }
    >
      <div className="flex flex-col items-start gap-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {params?.error
              ? `Detail: ${params.error}`
              : "An unexpected error occurred during authentication."}
          </p>
        </div>
      </div>
    </AuthShell>
  )
}
