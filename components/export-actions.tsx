"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  Download,
  ExternalLink,
  Copy,
  Loader2,
} from "lucide-react"
import {
  buildV0Prompt,
  openInV0,
  downloadStarterZip,
  openInStackBlitz,
  type ExportInput,
} from "@/lib/exporters"

type ExportActionsProps = {
  input: ExportInput | null
  /** Whether we currently have enough data to export (theme + headline ready) */
  ready: boolean
  className?: string
}

export function ExportActions({ input, ready, className }: ExportActionsProps) {
  const [busy, setBusy] = useState<null | "v0" | "zip" | "stackblitz" | "copy">(null)

  function guard(): input is NonNullable<ExportInput> {
    if (!ready || !input) {
      toast.error("Wait for the stack to compose first.")
      return false
    }
    return true
  }

  async function handleV0() {
    if (!guard() || !input) return
    setBusy("v0")
    try {
      openInV0(input)
      toast.success("Opening v0", {
        description: "Your brief and stack are pre-filled.",
      })
    } finally {
      setBusy(null)
    }
  }

  async function handleCopy() {
    if (!guard() || !input) return
    setBusy("copy")
    try {
      const prompt = buildV0Prompt(input)
      await navigator.clipboard.writeText(prompt)
      toast.success("v0 prompt copied")
    } finally {
      setBusy(null)
    }
  }

  async function handleZip() {
    if (!guard() || !input) return
    setBusy("zip")
    try {
      await downloadStarterZip(input)
      toast.success("Starter downloaded", {
        description: "Run `pnpm install && pnpm dev` to see it.",
      })
    } catch (e) {
      toast.error("Could not generate ZIP", {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setBusy(null)
    }
  }

  async function handleStackBlitz() {
    if (!guard() || !input) return
    setBusy("stackblitz")
    try {
      await openInStackBlitz(input)
    } catch (e) {
      toast.error("Could not open StackBlitz", {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleV0}
          disabled={!ready || busy !== null}
          data-cursor="hover"
          className="justify-start"
        >
          {busy === "v0" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Open in v0
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!ready || busy !== null}
          data-cursor="hover"
          className="justify-start"
        >
          {busy === "copy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
          Copy v0 prompt
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleZip}
          disabled={!ready || busy !== null}
          data-cursor="hover"
          className="justify-start"
        >
          {busy === "zip" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download ZIP
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleStackBlitz}
          disabled={!ready || busy !== null}
          data-cursor="hover"
          className="justify-start"
        >
          {busy === "stackblitz" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5" />
          )}
          StackBlitz
        </Button>
      </div>
    </div>
  )
}
