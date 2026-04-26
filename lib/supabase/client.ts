import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createStubClient, isSupabaseConfigured } from './stub'

/**
 * Browser-side Supabase client. If env vars are missing, returns a stub that
 * responds with "no user / empty data" so client components don't crash.
 */
export function createClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    return createStubClient() as SupabaseClient
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
