import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabasePublicConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public environment variables.");
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey
  };
}

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicConfig();

  return createClient(url, anonKey);
}

export function createSupabaseServerClient() {
  const { url, anonKey } = getSupabasePublicConfig();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false
    }
  });
}

export function createSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase service role environment variables.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });
}

export function hasSupabasePublicConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function hasSupabaseAdminConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}
