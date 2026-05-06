// ---------------------------------------------------------------------------
// lib/ai-models.ts — Centralized AI model configuration
// ---------------------------------------------------------------------------
//
// All AI-powered features route through this configuration. We use OpenRouter
// as the primary gateway since it provides access to the best models from
// Google, Anthropic, Mistral, xAI, and Azure-hosted OpenAI.
//
// Environment variables:
//   OPENROUTER_API_KEY - Required for all model calls
//   GEMINI_API_KEY     - Direct Gemini access (fallback, not currently used)
// ---------------------------------------------------------------------------

import { createOpenRouter } from "@openrouter/ai-sdk-provider"

/**
 * Create an OpenRouter provider instance.
 * All model calls go through OpenRouter for unified access.
 */
export function getOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required")
  }
  return createOpenRouter({ apiKey })
}

/**
 * Model configurations for different use cases.
 * Each has a primary model and a fallback for resilience.
 */
export const MODELS = {
  /**
   * Structured output generation (variants, themes, stack rationales).
   * Needs strong JSON schema adherence and creative reasoning.
   */
  structured: {
    // Gemini 2.0 Flash: fast, excellent structured output, multimodal
    primary: "google/gemini-2.0-flash-001",
    // Claude 3.5 Sonnet: strong reasoning, reliable JSON
    fallback: "anthropic/claude-3.5-sonnet",
  },

  /**
   * Vision/multimodal tasks (signature extraction from images).
   * Needs strong visual understanding + structured output.
   */
  vision: {
    // Gemini 2.0 Flash: native multimodal, fast
    primary: "google/gemini-2.0-flash-001",
    // GPT-4o via Azure: strong vision, structured output
    fallback: "openai/gpt-4o",
  },

  /**
   * Streaming text generation (real-time generation UI).
   * Needs low latency and good instruction following.
   */
  streaming: {
    // Gemini 2.0 Flash: very fast streaming
    primary: "google/gemini-2.0-flash-001",
    // Mistral Large: fast, good quality
    fallback: "mistralai/mistral-large",
  },
} as const

export type ModelCategory = keyof typeof MODELS

/**
 * Get the model string for a given category.
 * Returns the primary model; callers can access fallback via MODELS[category].fallback
 */
export function getModel(category: ModelCategory): string {
  return MODELS[category].primary
}

/**
 * Get the fallback model string for a given category.
 */
export function getFallbackModel(category: ModelCategory): string {
  return MODELS[category].fallback
}
