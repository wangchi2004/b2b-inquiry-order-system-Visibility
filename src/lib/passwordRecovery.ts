import { createClient } from '@supabase/supabase-js';

// Keep recovery credentials separate from the normal customer session.
export function createRecoveryClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit', persistSession: false, storageKey: 'password-recovery', detectSessionInUrl: true } },
  );
}
