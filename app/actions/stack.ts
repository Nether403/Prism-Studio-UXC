"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

function shortId(len = 8): string {
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
  /** Optional: when the user is signed in, defaults to draft (private). */
  asDraft?: boolean
  /** Optional: human title for dashboard display. */
  title?: string
}

export type SaveResult = { id: string; owned: boolean } | { error: string }

export async function saveStack(input: SaveStackInput): Promise<SaveResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const id = shortId()
    const owned = !!user
    // Anonymous saves are public by default. Authenticated saves go to drafts unless asDraft === false.
    const published = owned ? input.asDraft === false : true

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
      user_id: user?.id ?? null,
      title: input.title ?? input.headline ?? null,
      published,
    })

    if (error) {
      console.error("[v0] saveStack error:", error)
      return { error: error.message }
    }

    revalidatePath("/gallery")
    if (owned) revalidatePath("/dashboard")
    return { id, owned }
  } catch (e) {
    console.error("[v0] saveStack exception:", e)
    return { error: "Failed to save" }
  }
}

export async function toggleLike(
  id: string,
): Promise<{ liked: boolean; likes: number } | { error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Sign in to like stacks" }

    const { data, error } = await supabase.rpc("toggle_like", { stack_id: id })
    if (error) {
      console.error("[v0] toggleLike error:", error)
      return { error: error.message }
    }
    const row = Array.isArray(data) ? data[0] : data
    revalidatePath(`/s/${id}`)
    revalidatePath("/gallery")
    return {
      liked: !!row?.liked,
      likes: typeof row?.likes === "number" ? row.likes : 0,
    }
  } catch (e) {
    console.error("[v0] toggleLike exception:", e)
    return { error: "Failed to like" }
  }
}

export async function renameStack(
  id: string,
  title: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("stacks")
    .update({ title: title.trim() || null })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  revalidatePath(`/s/${id}`)
  return { ok: true }
}

export async function setPublished(
  id: string,
  published: boolean,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("stacks").update({ published }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  revalidatePath("/gallery")
  revalidatePath(`/s/${id}`)
  return { ok: true }
}

export async function deleteStack(id: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("stacks").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  revalidatePath("/gallery")
  return { ok: true }
}

export async function forkStack(
  parentId: string,
  newTitle?: string,
): Promise<{ id: string } | { error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Sign in to fork" }

    const newId = shortId()
    const { data, error } = await supabase.rpc("fork_stack", {
      parent_id: parentId,
      new_id: newId,
      new_title: newTitle ?? null,
    })
    if (error) {
      console.error("[v0] forkStack error:", error)
      return { error: error.message }
    }
    revalidatePath("/dashboard")
    return { id: typeof data === "string" ? data : newId }
  } catch (e) {
    console.error("[v0] forkStack exception:", e)
    return { error: "Failed to fork" }
  }
}

export async function updateStack(
  id: string,
  patch: Partial<{
    title: string
    prompt: string
    vibe: string
    audience: string
    performance: string
    include_paid: boolean
    headline: string
    rationale: string
    stack_ids: string[]
    reasons: Record<string, string>
    theme: Record<string, unknown>
    impact_score: number
    perf_budget: number
  }>,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("stacks").update(patch).eq("id", id)
  if (error) {
    console.error("[v0] updateStack error:", error)
    return { error: error.message }
  }
  revalidatePath(`/s/${id}`)
  revalidatePath(`/dashboard/edit/${id}`)
  revalidatePath("/dashboard")
  return { ok: true }
}
