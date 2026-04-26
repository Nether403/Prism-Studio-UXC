/**
 * Stub Supabase client used when NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY
 * are missing (e.g. local sandbox without the integration connected).
 *
 * Goals:
 *   - Don't throw — let the app render in a "logged out, no data" state.
 *   - Duck-type enough of the client surface that existing call sites compile
 *     without a flood of optional chaining.
 *
 * Behavior:
 *   - auth.getUser() / getSession() → { data: { user: null }, error: null }
 *   - auth.signIn* / signUp / signOut → { data: null, error: <message> }
 *   - from(table).select/insert/update/delete/etc. → thenable that resolves
 *     to { data: [], error: null, count: 0 }; chainable for .eq/.in/.order/.limit/...
 *   - storage.from(bucket) → minimal { upload, download, getPublicUrl } stubs
 *   - rpc(name, args) → { data: null, error: null }
 *
 * This matches the shape the app uses; it does NOT pretend to be a real
 * SupabaseClient. We cast at the boundary so types stay clean.
 */

type StubError = { message: string; name: string; status: number }

const NOT_CONFIGURED: StubError = {
  message: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)",
  name: "SupabaseNotConfigured",
  status: 503,
}

function emptyResult() {
  return { data: [], error: null, count: 0 }
}

function buildQueryBuilder(): unknown {
  // A query builder is both thenable AND chainable. Every chain method returns
  // the same builder (so .eq(...).order(...).limit(...) keeps working). When
  // awaited, it resolves to an empty result set.
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: ReturnType<typeof emptyResult>) => unknown) =>
          Promise.resolve(emptyResult()).then(resolve)
      }
      // single() / maybeSingle() conventionally return one row, not an array.
      if (prop === "single" || prop === "maybeSingle") {
        return () =>
          Promise.resolve({ data: null, error: null, count: 0 })
      }
      // csv() returns a string body.
      if (prop === "csv") {
        return () => Promise.resolve({ data: "", error: null })
      }
      // Any other property is treated as a chain method.
      return () => proxy
    },
  }
  const proxy: object = new Proxy({}, handler)
  return proxy
}

const auth = {
  getUser: async () => ({ data: { user: null }, error: null }),
  getSession: async () => ({ data: { session: null }, error: null }),
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: NOT_CONFIGURED }),
  signInWithOAuth: async () => ({ data: { provider: null, url: null }, error: NOT_CONFIGURED }),
  signInWithOtp: async () => ({ data: { user: null, session: null }, error: NOT_CONFIGURED }),
  signUp: async () => ({ data: { user: null, session: null }, error: NOT_CONFIGURED }),
  signOut: async () => ({ error: null }),
  exchangeCodeForSession: async () => ({ data: { session: null, user: null }, error: NOT_CONFIGURED }),
  resetPasswordForEmail: async () => ({ data: null, error: NOT_CONFIGURED }),
  updateUser: async () => ({ data: { user: null }, error: NOT_CONFIGURED }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
}

const storage = {
  from: () => ({
    upload: async () => ({ data: null, error: NOT_CONFIGURED }),
    download: async () => ({ data: null, error: NOT_CONFIGURED }),
    remove: async () => ({ data: null, error: NOT_CONFIGURED }),
    list: async () => ({ data: [], error: null }),
    getPublicUrl: () => ({ data: { publicUrl: "" } }),
    createSignedUrl: async () => ({ data: { signedUrl: "" }, error: NOT_CONFIGURED }),
  }),
}

export function createStubClient(): unknown {
  return {
    auth,
    storage,
    from: () => buildQueryBuilder(),
    rpc: async () => ({ data: null, error: null }),
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => ({ unsubscribe: () => {} }),
      unsubscribe: () => {},
    }),
    removeChannel: () => {},
    removeAllChannels: () => {},
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
