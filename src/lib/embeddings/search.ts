import { createSupabaseAdminClient } from "@/lib/supabase";
import { EMBEDDING_MODEL, type SemanticMatch } from "./core";
import { embeddingConfigured, queryEmbedding } from "./provider";
import type { parseSearchOptions } from "@/lib/searchOptions";
export async function semanticProductSearch(options: ReturnType<typeof parseSearchOptions>): Promise<{ matches: SemanticMatch[]; status: string }> {
  if (!options.q || !embeddingConfigured()) return { matches: [], status: "disabled" };
  try {
    const db = createSupabaseAdminClient();
    const { data: ready, error: readyError } = await db.from("product_embeddings").select("product_id").eq("status","ready").eq("embedding_model",EMBEDDING_MODEL).not("embedding","is",null).limit(1).abortSignal(AbortSignal.timeout(2000));
    if (readyError) throw readyError;
    if (!ready?.length) return { matches: [], status: "indexing" };
    const embedding = await queryEmbedding(options.q);
    const { data, error } = await db.rpc("match_product_embeddings", { p_embedding:JSON.stringify(embedding),p_model:EMBEDDING_MODEL,p_color:options.color,p_size:options.size,p_material:options.material,p_availability:options.availability }).abortSignal(AbortSignal.timeout(5000));
    if (error) throw error;
    return { matches:data ?? [], status:"ready" };
  } catch { return { matches:[],status:"unavailable" }; }
}
