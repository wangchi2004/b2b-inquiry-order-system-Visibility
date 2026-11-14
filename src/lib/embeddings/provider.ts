import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, validEmbedding } from "./core.ts";
export function embeddingConfigured() { return Boolean(process.env.OPENAI_API_KEY?.trim()); }
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!embeddingConfigured()) throw new Error("EMBEDDING_NOT_CONFIGURED");
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text, dimensions: EMBEDDING_DIMENSIONS }),
    signal: AbortSignal.timeout(10000), cache: "no-store",
  });
  if (!response.ok) throw new Error(`EMBEDDING_HTTP_${response.status}`);
  const data = await response.json();
  if (data.model !== EMBEDDING_MODEL || !validEmbedding(data.data?.[0]?.embedding)) throw new Error("EMBEDDING_INVALID_RESPONSE");
  return data.data[0].embedding;
}
// Bounded per-process cache; only stores public search text vectors, never product prices.
const queryCache = new Map<string,{ expires: number; value: Promise<number[]> }>();
let nextRequestAt = 0;
export async function queryEmbedding(query: string) {
  const key = query.trim().toLowerCase();
  const cached = queryCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  // A per-instance spending guard, not a distributed rate limiter.
  if (Date.now() < nextRequestAt) throw new Error("EMBEDDING_BUSY");
  nextRequestAt = Date.now() + 500;
  if (queryCache.size >= 100) queryCache.delete(queryCache.keys().next().value!);
  const value = generateEmbedding(query).catch(error => { queryCache.delete(key); throw error; });
  queryCache.set(key, { expires: Date.now() + 300000, value });
  return value;
}
