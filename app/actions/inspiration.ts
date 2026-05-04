"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type InspirationResult = { ok: true } | { error: string }

function shortStackId(len = 8): string {
  // Same alphabet/pattern as actions/stack.ts so dashboard rows look consistent.
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"
  let out = ""
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < len; i++) {
    out += alphabet[bytes[i] % alphabet.length]
  }
  return out
}

export type VariantSavePayload = {
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
  /** Human title for the dashboard, e.g. "Maximalist variant of Stripe". */
  title?: string
}

export type VariantSaveResult = { id: string } | { error: string }

/**
 * Save a "More like this" variant generated from an existing inspiration.
 *
 * Two writes happen atomically from the user's perspective:
 *   1. A new public-by-default `stacks` row owned by the caller.
 *   2. A new `inspirations` row that:
 *      - clones source_type / source_ref / screenshot_url / signature from
 *        the parent (so the variant carries the same captured visual
 *        artifacts), but
 *      - sets `parent_inspiration_id` to walk back to the source, and
 *      - leaves `source_hash` null so we don't collide with the parent's
 *        unique (owner_id, source_hash) constraint when the same user
 *        re-rolls their own capture.
 *
 * The resulting share page (`/s/<new-id>`) renders provenance pointing at
 * the new inspiration row, which itself links back to the parent via
 * `parent_inspiration_id` — letting future UI surface "variant of …" lineage
 * trees without changing the stack schema.
 */
export async function saveVariantFromInspiration(
  parentInspirationId: string,
  variant: VariantSavePayload,
): Promise<VariantSaveResult> {
  if (!parentInspirationId) return { error: "Missing parent inspiration id" }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Sign in to save variants" }

    // Pull the source row. RLS guarantees we can only see public-or-owned
    // rows here, so a user who can read the parent is implicitly authorized
    // to derive a variant from it.
    const { data: parent, error: parentErr } = await supabase
      .from("inspirations")
      .select("id, source_type, source_ref, screenshot_url, signature")
      .eq("id", parentInspirationId)
      .maybeSingle()

    if (parentErr) {
      console.error("[v0] saveVariantFromInspiration parent fetch:", parentErr)
      return { error: parentErr.message }
    }
    if (!parent) return { error: "Parent inspiration not found or not accessible" }

    const stackId = shortStackId()

    // Step 1 — write the variant stack. Variants are published immediately
    // (matches the rest of the gallery's behavior for owned saves where
    // asDraft is unset) so the user can share it the moment it's saved.
    const { error: stackErr } = await supabase.from("stacks").insert({
      id: stackId,
      prompt: variant.prompt,
      vibe: variant.vibe,
      audience: variant.audience,
      performance: variant.performance,
      include_paid: variant.includePaid,
      headline: variant.headline,
      rationale: variant.rationale,
      stack_ids: variant.stackIds,
      reasons: variant.reasons,
      theme: variant.theme,
      impact_score: variant.impactScore,
      perf_budget: variant.perfBudget,
      user_id: user.id,
      title: variant.title ?? variant.headline ?? null,
      published: true,
    })

    if (stackErr) {
      console.error("[v0] saveVariantFromInspiration stack insert:", stackErr)
      return { error: stackErr.message }
    }

    // Step 2 — write the variant inspiration. We deliberately set
    // source_hash to null so the (owner_id, source_hash) unique index never
    // conflicts when the user has already captured this URL/image directly.
    const { error: inspErr } = await supabase.from("inspirations").insert({
      owner_id: user.id,
      source_type: parent.source_type,
      source_ref: parent.source_ref,
      source_hash: null,
      screenshot_url: parent.screenshot_url,
      signature: parent.signature,
      generated_stack_id: stackId,
      parent_inspiration_id: parent.id,
      is_public: false,
    })

    if (inspErr) {
      // The stack itself succeeded — surface the error but don't block the
      // user from seeing their result. The dashboard will just show the
      // stack without provenance until they retry.
      console.error("[v0] saveVariantFromInspiration inspiration insert:", inspErr)
    }

    revalidatePath("/dashboard")
    revalidatePath("/gallery")
    revalidatePath(`/s/${stackId}`)
    return { id: stackId }
  } catch (e) {
    console.error("[v0] saveVariantFromInspiration exception:", e)
    return { error: "Failed to save variant" }
  }
}

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

export type BulkPrivacyResult = { ok: true; updated: number } | { error: string }

/**
 * Flip `is_public` on a batch of inspirations the caller owns.
 *
 * The dashboard "manage privacy" mode collects a set of selected captures
 * and dispatches them in a single round-trip rather than firing N parallel
 * server actions. RLS still enforces ownership row-by-row, but we double
 * up with `eq("owner_id", user.id)` so a malicious payload of foreign ids
 * never even hits the policy layer.
 *
 * Empty arrays no-op cleanly so the client can call this without first
 * gating on selection length.
 */
export async function setInspirationsPublicBulk(
  inspirationIds: string[],
  isPublic: boolean,
): Promise<BulkPrivacyResult> {
  if (!Array.isArray(inspirationIds) || inspirationIds.length === 0) {
    return { ok: true, updated: 0 }
  }
  // Defensive cap — the strip surfaces 24 rows max, so any payload above
  // that is either a UI bug or someone poking the action directly.
  if (inspirationIds.length > 100) {
    return { error: "Too many inspirations selected" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Sign in" }

  const { data, error } = await supabase
    .from("inspirations")
    .update({ is_public: isPublic })
    .in("id", inspirationIds)
    .eq("owner_id", user.id)
    .select("id")

  if (error) {
    console.error("[v0] setInspirationsPublicBulk error:", error)
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  return { ok: true, updated: data?.length ?? 0 }
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
