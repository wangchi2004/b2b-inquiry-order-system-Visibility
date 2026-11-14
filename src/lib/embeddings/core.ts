export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export type TextMatch = { product_id: string; relevance: number };
export type SemanticMatch = { product_id: string; similarity: number };
export function mergeSearchMatches(text: TextMatch[], semantic: SemanticMatch[]): TextMatch[] {
  // Keep deterministic exact matches first, then supplement using vector order; deduplicate IDs.
  const scores = new Map(text.map(m => [m.product_id, m.relevance + 100]));
  semantic.forEach((m, index) => {
    if (Number.isFinite(m.similarity) && m.similarity >= 0.35 && !scores.has(m.product_id)) scores.set(m.product_id, 20 - index / 100);
  });
  return [...scores].map(([product_id, relevance]) => ({ product_id, relevance }));
}
export function validEmbedding(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === EMBEDDING_DIMENSIONS && value.every(v => typeof v === "number" && Number.isFinite(v)) && value.some(v => v !== 0);
}
type Document = {
 name: string; slug?: string; sku?: string | null; description?: string | null; category?: string | null;
 material?: string | null; color?: string | null; size?: string | null; keywords?: string[];
 product_variants?: { sku: string; size: string | null; color: string | null }[];
 product_translations?: { name: string; description: string | null }[];
};
export function productEmbeddingText(product: Document): string {
  // Deliberately excludes prices, stock, costs, MOQ and all customer/order information.
  const text = [product.name, product.slug, product.sku, product.description, product.category, product.material, product.color, product.size,
    ...(product.keywords || []), ...(product.product_variants || []).flatMap(v => [v.sku,v.size,v.color]),
    ...(product.product_translations || []).flatMap(t => [t.name,t.description])].filter(Boolean).join("\n");
  return new TextDecoder().decode(new TextEncoder().encode(text).slice(0,6000));
}
