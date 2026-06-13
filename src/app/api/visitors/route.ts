import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

const supportedLocales = new Set(["en", "ko", "ja", "zh"]);

type VisitorRequestBody = {
  email?: unknown;
  country?: unknown;
  locale?: unknown;
};

export async function POST(request: Request) {
  let body: VisitorRequestBody;

  try {
    body = (await request.json()) as VisitorRequestBody;
  } catch {
    return NextResponse.json(
      { message: "Invalid visitor payload." },
      { status: 400 }
    );
  }

  const email = normalizeEmail(body.email);
  const country = readOptionalString(body.country);
  const locale = normalizeLocale(body.locale);

  if (!email) {
    return NextResponse.json(
      { message: "A valid email is required." },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: existingVisitor, error: findError } = await supabase
      .from("visitor_sessions")
      .select("id, visit_count")
      .eq("email", email)
      .maybeSingle();

    if (findError) {
      console.warn("Failed to read visitor session", findError);
      return NextResponse.json(
        {
          ok: false,
          warning:
            "Visitor tracking table is not ready. Run supabase/visitor_sessions.sql."
        },
        { status: 200 }
      );
    }

    if (existingVisitor) {
      const { error: updateError } = await supabase
        .from("visitor_sessions")
        .update({
          country,
          locale,
          visit_count: Number(existingVisitor.visit_count ?? 0) + 1,
          last_seen_at: new Date().toISOString()
        })
        .eq("id", existingVisitor.id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ ok: true });
    }

    const { error: insertError } = await supabase
      .from("visitor_sessions")
      .insert({
        email,
        country,
        locale,
        visit_count: 1
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to record visitor session", error);
    return NextResponse.json(
      { message: "Failed to record visitor session." },
      { status: 500 }
    );
  }
}

function normalizeEmail(value: unknown) {
  const email = readOptionalString(value)?.toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  return email;
}

function normalizeLocale(value: unknown) {
  const locale = readOptionalString(value)?.toLowerCase();

  return locale && supportedLocales.has(locale) ? locale : "en";
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
