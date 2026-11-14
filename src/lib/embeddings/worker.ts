import { createClient } from "@supabase/supabase-js";
import { EMBEDDING_MODEL, productEmbeddingText } from "./core.ts";
import { embeddingConfigured, generateEmbedding } from "./provider.ts";
export async function processProductEmbeddings(limit = 5) {
  if (!embeddingConfigured()) return { configured: false, processed: 0, failed: 0, superseded: 0 };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("DATABASE_NOT_CONFIGURED");
  const db = createClient(url,key,{ auth: { persistSession: false } });
  const { data: jobs, error } = await db.rpc("claim_product_embeddings",{ p_limit: limit }).abortSignal(AbortSignal.timeout(5000));
  if (error) throw new Error("EMBEDDING_QUEUE_UNAVAILABLE");
  const result = { configured: true, processed: 0, failed: 0, superseded: 0 };
  await Promise.all((jobs ?? []).map(async (job: { product_id: string; revision: number; lease_token: string; attempts: number }) => {
    try {
      const { data: product, error: readError } = await db.from("products").select("name,slug,sku,description,category,material,color,size,keywords,status,product_variants(sku,size,color),product_translations(name,description)").eq("id",job.product_id).abortSignal(AbortSignal.timeout(5000)).single();
      if (readError || !product) throw new Error("PRODUCT_READ_FAILED");
      const embedding = product.status === "active" ? await generateEmbedding(productEmbeddingText(product)) : null;
      const { data: saved, error: saveError } = await db.from("product_embeddings").update({
        embedding: embedding ? JSON.stringify(embedding) : null, embedding_model: EMBEDDING_MODEL,
        status: "ready", lease_token: null, lease_until: null, last_error: null, updated_at: new Date().toISOString(),
      }).eq("product_id",job.product_id).eq("revision",job.revision).eq("lease_token",job.lease_token).select("product_id").abortSignal(AbortSignal.timeout(5000));
      if (saveError) throw new Error("EMBEDDING_SAVE_FAILED");
      if (saved?.length) result.processed++; else result.superseded++;
    } catch {
      result.failed++;
      const { error: retryError } = await db.from("product_embeddings").update({ status: "pending",lease_token:null,lease_until:null,last_error:"GENERATION_FAILED",next_attempt_at:new Date(Date.now()+Math.min(3600000,60000*2**Math.min(job.attempts,6))).toISOString(),updated_at:new Date().toISOString() }).eq("product_id",job.product_id).eq("revision",job.revision).eq("lease_token",job.lease_token).abortSignal(AbortSignal.timeout(5000));
      if (retryError) console.error("Embedding retry could not be scheduled; lease recovery will retry.");
    }
  }));
  return result;
}
