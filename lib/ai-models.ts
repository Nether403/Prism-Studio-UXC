// ---------------------------------------------------------------------------
// lib/ai-models.ts — Centralized AI model configuration
// ---------------------------------------------------------------------------
//
// All AI-powered features use Google Gemini 3.1 Pro as the primary model.
// Instead of different fallback models, we use different API keys as fallbacks
// for the same model — this ensures consistent behavior while providing
// redundancy across providers.
//
// Fallback chain:
//   1. OpenRouter (OPENROUTER_API_KEY)
//   2. Google AI Studio (AI_STUDIO_GEMINI_API_KEY)
//   3. Direct Gemini (GEMINI_API_KEY)
//
// Environment variables (at least one required):
//   OPENROUTER_API_KEY        - OpenRouter gateway access
//   AI_STUDIO_GEMINI_API_KEY  - Google AI Studio direct access
//   GEMINI_API_KEY            - Direct Gemini API access
// ---------------------------------------------------------------------------

import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

/**
 * The single model used across all AI features.
 * Gemini 3.1 Pro: excellent reasoning, structured output, multimodal, fast.
 */
export const MODEL_ID = "google/gemini-3.1-pro-preview"
export const MODEL_ID_DATED = "google/gemini-3.1-pro-preview-20260219"

// For direct Google API access (AI Studio / Gemini API keys)
const GOOGLE_MODEL_ID = "gemini-3.1-pro-preview"

type ProviderType = "openrouter" | "google-ai-studio" | "google-direct"

interface ProviderConfig {
  type: ProviderType
  envVar: string
  createProvider: (apiKey: string) => ReturnType<typeof createOpenRouter> | ReturnType<typeof createGoogleGenerativeAI>
  modelId: string
}

const PROVIDER_CHAIN: ProviderConfig[] = [
  {
    type: "openrouter",
    envVar: "OPENROUTER_API_KEY",
    createProvider: (apiKey) => createOpenRouter({ apiKey }),
    modelId: MODEL_ID,
  },
  {
    type: "google-ai-studio",
    envVar: "AI_STUDIO_GEMINI_API_KEY",
    createProvider: (apiKey) => createGoogleGenerativeAI({ apiKey }),
    modelId: GOOGLE_MODEL_ID,
  },
  {
    type: "google-direct",
    envVar: "GEMINI_API_KEY",
    createProvider: (apiKey) => createGoogleGenerativeAI({ apiKey }),
    modelId: GOOGLE_MODEL_ID,
  },
]

/**
 * Get the first available provider from the fallback chain.
 * Returns the provider factory function and the model ID to use with it.
 */
export function getAvailableProvider(): {
  provider: ReturnType<typeof createOpenRouter> | ReturnType<typeof createGoogleGenerativeAI>
  modelId: string
  type: ProviderType
} {
  for (const config of PROVIDER_CHAIN) {
    const apiKey = process.env[config.envVar]
    if (apiKey) {
      return {
        provider: config.createProvider(apiKey),
        modelId: config.modelId,
        type: config.type,
      }
    }
  }

  throw new Error(
    "No AI API key configured. Please set one of: OPENROUTER_API_KEY, AI_STUDIO_GEMINI_API_KEY, or GEMINI_API_KEY"
  )
}

/**
 * Get the model instance ready for use with AI SDK.
 * This is the main entry point for all AI calls.
 *
 * @example
 * const model = getModel()
 * const { object } = await generateObject({ model, schema, prompt })
 */
export function getModel() {
  const { provider, modelId } = getAvailableProvider()
  return provider(modelId)
}

/**
 * Try an AI operation with automatic fallback across providers.
 * If the primary provider fails, it will try the next available one.
 *
 * @example
 * const result = await withFallback(async (model) => {
 *   return generateObject({ model, schema, prompt })
 * })
 */
export async function withFallback<T>(
  operation: (model: ReturnType<typeof getModel>) => Promise<T>
): Promise<T> {
  const errors: Error[] = []

  for (const config of PROVIDER_CHAIN) {
    const apiKey = process.env[config.envVar]
    if (!apiKey) continue

    try {
      const provider = config.createProvider(apiKey)
      const model = provider(config.modelId)
      return await operation(model)
    } catch (error) {
      console.error(`[v0] AI call failed with ${config.type}:`, error)
      errors.push(error instanceof Error ? error : new Error(String(error)))
      // Continue to next provider
    }
  }

  // All providers failed
  const errorMessages = errors.map((e, i) => `${PROVIDER_CHAIN[i]?.type}: ${e.message}`).join("; ")
  throw new Error(`All AI providers failed. Errors: ${errorMessages}`)
}

// Legacy exports for backwards compatibility (if any code uses MODELS)
export const MODELS = {
  structured: { primary: MODEL_ID, fallback: MODEL_ID },
  vision: { primary: MODEL_ID, fallback: MODEL_ID },
  streaming: { primary: MODEL_ID, fallback: MODEL_ID },
} as const

// Legacy function kept for compatibility
export function getOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    // Fall through to other providers
    const { provider } = getAvailableProvider()
    return provider
  }
  return createOpenRouter({ apiKey })
}
