import type { ProductWithVariants } from "./types.ts";
export const searchSorts = ["relevance", "newest", "name", "price_asc", "price_desc"] as const;
export type SearchSort = typeof searchSorts[number];
export function parseSearchOptions(params: URLSearchParams) {
  const read = (key: string, max: number) => (params.get(key) || "").trim().slice(0, max);
  const availability = read("availability", 30);
  const sort = read("sort", 30);
  return {
    q: read("q", 200), color: read("color", 100), size: read("size", 100), material: read("material", 100),
    availability: ["in_stock", "out_of_stock", "preorder"].includes(availability) ? availability : "",
    sort: (searchSorts as readonly string[]).includes(sort) ? sort as SearchSort : "relevance" as SearchSort,
  };
}
export function sortSearchProducts(products: ProductWithVariants[], sort: SearchSort, rank: Map<string, number>) {
  const minimum = (p: ProductWithVariants) => {
    const prices = p.product_variants.map(v => v.price).filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0);
    return prices.length ? Math.min(...prices) : null;
  };
  return [...products].sort((a, b) => {
    if (sort === "name") return (a.translated_name || a.name).localeCompare(b.translated_name || b.name) || a.id.localeCompare(b.id);
    if (sort === "newest") return b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id);
    if (sort.startsWith("price")) {
      const ap = minimum(a), bp = minimum(b);
      // Keep currencies grouped: no fabricated exchange rate or cross-currency comparison.
      const currency = (a.currency || "USD").localeCompare(b.currency || "USD");
      if (currency) return currency;
      if (ap === null || bp === null) return ap === bp ? a.id.localeCompare(b.id) : ap === null ? 1 : -1;
      return (sort === "price_asc" ? ap - bp : bp - ap) || a.id.localeCompare(b.id);
    }
    return (rank.get(b.id) || 0) - (rank.get(a.id) || 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
}
