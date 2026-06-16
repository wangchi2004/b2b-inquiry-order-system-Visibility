import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

const supportedLocales = new Set(["en", "ko", "ja", "zh"]);
const supportedEvents = new Set(["page_view", "view_details"]);

type SampleAnalyticsRequestBody = {
  visitorId?: unknown;
  locale?: unknown;
  pagePath?: unknown;
  eventName?: unknown;
  productId?: unknown;
  productName?: unknown;
};

export async function POST(request: Request) {
  let body: SampleAnalyticsRequestBody;

  try {
    body = (await request.json()) as SampleAnalyticsRequestBody;
  } catch {
    return NextResponse.json(
      { message: "Invalid sample analytics payload." },
      { status: 400 }
    );
  }

  const visitorId = readOptionalString(body.visitorId);
  const eventName = normalizeEventName(body.eventName);
  const locale = normalizeLocale(body.locale);
  const pagePath = readOptionalString(body.pagePath)?.slice(0, 300);
  const productId = readOptionalString(body.productId);
  const productName = readOptionalString(body.productName)?.slice(0, 200);

  if (!visitorId || !eventName) {
    return NextResponse.json(
      { message: "visitorId and eventName are required." },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    if (eventName === "page_view") {
      await recordSampleVisit({
        supabase,
        visitorId,
        locale,
        pagePath
      });
    }

    if (eventName === "view_details") {
      await recordSampleClick({
        supabase,
        visitorId,
        locale,
        pagePath,
        eventName,
        productId,
        productName
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to record sample analytics", error);
    return NextResponse.json(
      {
        ok: false,
        warning:
          "Sample analytics tables are not ready. Run supabase/sample_analytics.sql."
      },
      { status: 200 }
    );
  }
}

async function recordSampleVisit({
  supabase,
  visitorId,
  locale,
  pagePath
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  visitorId: string;
  locale: string;
  pagePath?: string;
}) {
  const { data: existingVisitor, error: findError } = await supabase
    .from("sample_visitors")
    .select("id, visit_count")
    .eq("visitor_id", visitorId)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existingVisitor) {
    const { error: updateError } = await supabase
      .from("sample_visitors")
      .update({
        locale,
        page_path: pagePath,
        visit_count: Number(existingVisitor.visit_count ?? 0) + 1,
        last_seen_at: new Date().toISOString()
      })
      .eq("id", existingVisitor.id);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: insertError } = await supabase
    .from("sample_visitors")
    .insert({
      visitor_id: visitorId,
      locale,
      page_path: pagePath,
      visit_count: 1
    });

  if (insertError) {
    throw insertError;
  }
}

async function recordSampleClick({
  supabase,
  visitorId,
  locale,
  pagePath,
  eventName,
  productId,
  productName
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  visitorId: string;
  locale: string;
  pagePath?: string;
  eventName: string;
  productId?: string;
  productName?: string;
}) {
  const query = supabase
    .from("sample_clicks")
    .select("id, click_count")
    .eq("visitor_id", visitorId)
    .eq("event_name", eventName)
    .eq("page_path", pagePath ?? "");

  const { data: existingClick, error: findError } = productId
    ? await query.eq("product_id", productId).maybeSingle()
    : await query.is("product_id", null).maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existingClick) {
    const { error: updateError } = await supabase
      .from("sample_clicks")
      .update({
        locale,
        product_name: productName,
        click_count: Number(existingClick.click_count ?? 0) + 1,
        last_clicked_at: new Date().toISOString()
      })
      .eq("id", existingClick.id);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: insertError } = await supabase
    .from("sample_clicks")
    .insert({
      visitor_id: visitorId,
      locale,
      event_name: eventName,
      product_id: productId,
      product_name: productName,
      page_path: pagePath ?? "",
      click_count: 1
    });

  if (insertError) {
    throw insertError;
  }
}

function normalizeEventName(value: unknown) {
  const eventName = readOptionalString(value);

  return eventName && supportedEvents.has(eventName) ? eventName : null;
}

function normalizeLocale(value: unknown) {
  const locale = readOptionalString(value)?.toLowerCase();

  return locale && supportedLocales.has(locale) ? locale : "en";
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
