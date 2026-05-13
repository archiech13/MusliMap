import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS.
 * Only use server-side (Server Actions, Route Handlers).
 * Requires SUPABASE_SERVICE_ROLE_KEY in your environment.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local.');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
