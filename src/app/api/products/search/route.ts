import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";
import { parseSearchOptions } from "@/lib/searchOptions";
import { semanticProductSearch } from "@/lib/embeddings/search";
import { mergeSearchMatches } from "@/lib/embeddings/core";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  if (request.nextUrl.search.length > 2000) return NextResponse.json({ error: "Search is too long." }, { status: 400 });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Search temporarily unavailable." }, { status: 503 });
  const options = parseSearchOptions(request.nextUrl.searchParams);
  try {
    const { data, error } = await createSupabaseAdminClient().rpc("search_storefront_products", {
      p_query: options.q, p_color: options.color, p_size: options.size,
      p_material: options.material, p_availability: options.availability,
    }).abortSignal(AbortSignal.timeout(12000));
    if (error) throw error;
    const semantic = await semanticProductSearch(options);
    // Public product identifiers only. Never send service-role credentials or internal columns.
    return NextResponse.json({ matches: mergeSearchMatches(data ?? [], semantic.matches), semanticStatus: semantic.status }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Search temporarily unavailable. Please retry." }, { status: 503 });
  }
}
