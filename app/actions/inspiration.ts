"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type InspirationResult = { ok: true } | { error: string }

/**
 * Wire a saved stack back to the inspiration that produced it. Called from
 * client code right after `saveStack()` returns successfully on /from-image
 * so the dashboard can render provenance ("from this image / this URL").
 *
 * RLS guarantees we can only update an inspiration we own.
 */
export async function linkInspirationToStack(
  inspirationId: string,
  stackId: string,
): Promise<InspirationResult> {
  if (!inspirationId || !stackId) return { error: "Missing inspiration or stack id" }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Sign in to link inspirations" }

  const { error } = await supabase
    .from("inspirations")
    .update({ generated_stack_id: stackId })
    .eq("id", inspirationId)
    .eq("owner_id", user.id)

  if (error) {
    console.error("[v0] linkInspirationToStack error:", error)
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  revalidatePath(`/s/${stackId}`)
  return { ok: true }
}

/**
 * Toggle public visibility on an inspiration row.
 * Public rows show up in the dashboard's public lineage and on the stack page.
 */
export async function setInspirationPublic(
  inspirationId: string,
  isPublic: boolean,
): Promise<InspirationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Sign in" }

  const { error } = await supabase
    .from("inspirations")
    .update({ is_public: isPublic })
    .eq("id", inspirationId)
    .eq("owner_id", user.id)

  if (error) {
    console.error("[v0] setInspirationPublic error:", error)
    return { error: error.message }
  }
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function deleteInspiration(inspirationId: string): Promise<InspirationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Sign in" }

  const { error } = await supabase
    .from("inspirations")
    .delete()
    .eq("id", inspirationId)
    .eq("owner_id", user.id)

  if (error) {
    console.error("[v0] deleteInspiration error:", error)
    return { error: error.message }
  }
  revalidatePath("/dashboard")
  return { ok: true }
}
