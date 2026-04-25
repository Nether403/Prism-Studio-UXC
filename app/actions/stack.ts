"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

function shortId(len = 8): string {
  // url-safe random id
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"
  let out = ""
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < len; i++) {
    out += alphabet[bytes[i] % alphabet.length]
  }
  return out
}

export type SaveStackInput = {
  prompt: string
  vibe: string
  audience: string
  performance: string
  includePaid: boolean
  headline: string
  rationale: string
  stackIds: string[]
  reasons: Record<string, string>
  theme: Record<string, unknown>
  impactScore: number
  perfBudget: number
}

export async function saveStack(input: SaveStackInput): Promise<{ id: string } | { error: string }> {
  try {
    const supabase = await createClient()
    const id = shortId()
    const { error } = await supabase.from("stacks").insert({
      id,
      prompt: input.prompt,
      vibe: input.vibe,
      audience: input.audience,
      performance: input.performance,
      include_paid: input.includePaid,
      headline: input.headline,
      rationale: input.rationale,
      stack_ids: input.stackIds,
      reasons: input.reasons,
      theme: input.theme,
      impact_score: input.impactScore,
      perf_budget: input.perfBudget,
    })

    if (error) {
      console.error("[v0] saveStack error:", error)
      return { error: error.message }
    }

    revalidatePath("/gallery")
    return { id }
  } catch (e) {
    console.error("[v0] saveStack exception:", e)
    return { error: "Failed to save" }
  }
}

export async function likeStack(id: string): Promise<{ likes: number } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("like_stack", { stack_id: id })
    if (error) {
      console.error("[v0] likeStack error:", error)
      return { error: error.message }
    }
    revalidatePath(`/s/${id}`)
    revalidatePath("/gallery")
    return { likes: typeof data === "number" ? data : 0 }
  } catch (e) {
    console.error("[v0] likeStack exception:", e)
    return { error: "Failed to like" }
  }
}
