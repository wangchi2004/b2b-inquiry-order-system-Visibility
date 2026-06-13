import { createSupabaseAdminClient } from "@/lib/supabase";

export type AdminVisitorSession = {
  id: string;
  email: string;
  country: string | null;
  locale: string;
  visit_count: number;
  first_seen_at: string;
  last_seen_at: string;
};

export async function getAdminVisitorSessions() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("visitor_sessions")
    .select("id,email,country,locale,visit_count,first_seen_at,last_seen_at")
    .order("last_seen_at", { ascending: false });

  if (error) {
    return {
      visitors: [] as AdminVisitorSession[],
      error:
        "Could not load visitor sessions. Run supabase/visitor_sessions.sql in Supabase SQL Editor."
    };
  }

  return {
    visitors: (data ?? []) as AdminVisitorSession[],
    error: null
  };
}
