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

export type AdminSampleVisitor = {
  id: string;
  visitor_id: string;
  locale: string;
  page_path: string | null;
  visit_count: number;
  first_seen_at: string;
  last_seen_at: string;
};

type AdminSampleClickRow = {
  id: string;
  visitor_id: string;
  locale: string;
  event_name: string;
  product_id: string | null;
  product_name: string | null;
  page_path: string | null;
  click_count: number;
  last_clicked_at: string;
};

export type AdminSampleClickSummary = {
  product_id: string | null;
  product_name: string;
  locale: string;
  click_count: number;
  unique_visitors: number;
  last_clicked_at: string;
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

export async function getAdminSampleAnalytics() {
  const supabase = createSupabaseAdminClient();

  const [{ data: visitorsData, error: visitorsError }, { data: clicksData, error: clicksError }] =
    await Promise.all([
      supabase
        .from("sample_visitors")
        .select("id,visitor_id,locale,page_path,visit_count,first_seen_at,last_seen_at")
        .order("last_seen_at", { ascending: false }),
      supabase
        .from("sample_clicks")
        .select("id,visitor_id,locale,event_name,product_id,product_name,page_path,click_count,last_clicked_at")
        .eq("event_name", "view_details")
        .order("last_clicked_at", { ascending: false })
    ]);

  const visitors = (visitorsData ?? []) as AdminSampleVisitor[];
  const clickRows = (clicksData ?? []) as AdminSampleClickRow[];

  return {
    sampleVisitors: visitors,
    sampleClicks: summarizeSampleClicks(clickRows),
    error: visitorsError || clicksError
      ? "Could not load sample analytics. Run supabase/sample_analytics.sql in Supabase SQL Editor."
      : null
  };
}

function summarizeSampleClicks(rows: AdminSampleClickRow[]) {
  const summaries = new Map<string, AdminSampleClickSummary & {
    visitorIds: Set<string>;
  }>();

  for (const row of rows) {
    const key = row.product_id ?? row.product_name ?? "unknown";
    const existingSummary = summaries.get(key);

    if (existingSummary) {
      existingSummary.click_count += Number(row.click_count ?? 0);
      existingSummary.visitorIds.add(row.visitor_id);

      if (new Date(row.last_clicked_at) > new Date(existingSummary.last_clicked_at)) {
        existingSummary.last_clicked_at = row.last_clicked_at;
        existingSummary.locale = row.locale;
      }

      continue;
    }

    summaries.set(key, {
      product_id: row.product_id,
      product_name: row.product_name ?? "Unknown product",
      locale: row.locale,
      click_count: Number(row.click_count ?? 0),
      unique_visitors: 1,
      last_clicked_at: row.last_clicked_at,
      visitorIds: new Set([row.visitor_id])
    });
  }

  return Array.from(summaries.values())
    .map(({ visitorIds, ...summary }) => ({
      ...summary,
      unique_visitors: visitorIds.size
    }))
    .sort((a, b) => b.click_count - a.click_count);
}
