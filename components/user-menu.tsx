"use client"

import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/actions/auth"
import { LayoutDashboard, LogOut, User as UserIcon, Sparkles } from "lucide-react"

export function UserMenu({
  email,
  username,
}: {
  email: string | null
  username: string | null
}) {
  const initials = (username || email || "?")
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 px-2 font-mono text-xs"
          data-cursor="hover"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-medium text-primary">
            {initials || <UserIcon className="h-3 w-3" />}
          </span>
          <span className="hidden sm:inline normal-case">
            {username || email?.split("@")[0] || "Account"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{username || "Account"}</span>
            <span className="text-xs text-muted-foreground truncate">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <LayoutDashboard className="h-4 w-4" />
            My stacks
          </Link>
        </DropdownMenuItem>
        {username && (
          <DropdownMenuItem asChild>
            <Link href={`/u/${username}`} className="cursor-pointer">
              <Sparkles className="h-4 w-4" />
              Public profile
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={signOut} className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-2 text-left"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
