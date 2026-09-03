import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client using the Service Role Key.
 * Bypasses Row Level Security (RLS).
 * ONLY for use in secure server-side environments (API routes, server actions).
 * NEVER expose this client or the service role key to the browser.
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase URL or Service Role Key in environment.')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
