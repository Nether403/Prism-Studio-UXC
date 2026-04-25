import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { NavShell } from "@/components/nav-shell"
import { UserMenu } from "@/components/user-menu"

export async function Nav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let username: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle()
    username = profile?.username ?? null
  }

  const authSlot = user ? (
    <UserMenu email={user.email ?? null} username={username} />
  ) : (
    <Button asChild size="sm" className="font-medium" data-cursor="hover">
      <Link href="/auth/login">Sign in</Link>
    </Button>
  )

  return <NavShell authSlot={authSlot} />
}
