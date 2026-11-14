"use client";
import type { ProductWithVariants } from "@/lib/types";
import { parseSearchOptions } from "@/lib/searchOptions";
export function SearchFilters({ products, params, update }: { products: ProductWithVariants[]; params: URLSearchParams; update: (key: string, value: string) => void }) {
  const options = parseSearchOptions(params);
  const distinct = (values: (string | null | undefined)[]) => [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a,b) => a.localeCompare(b, "en", { numeric: true }));
  const fields = [
    { key: "category", label: "Category", values: distinct(products.map(p => p.category)) },
    { key: "color", label: "Color", values: distinct(products.flatMap(p => [p.color, ...p.product_variants.map(v => v.color || p.color)])) },
    { key: "size", label: "Size", values: distinct(products.flatMap(p => [p.size, ...p.product_variants.map(v => v.size)])) },
    { key: "material", label: "Material", values: distinct(products.map(p => p.material)) },
  ];
  return <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
    {fields.map(field => <label key={field.key} className="min-w-0 text-sm font-medium">{field.label}<select aria-label={field.label} value={params.get(field.key) || ""} onChange={e => update(field.key,e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-2 text-base"><option value="">{field.key === "category" ? "All categories" : `All ${field.label.toLowerCase()}s`}</option>{params.get(field.key) && !field.values.includes(params.get(field.key)!) ? <option value={params.get(field.key)!}>{params.get(field.key)}</option> : null}{field.values.map(v => <option key={v} value={v}>{v}</option>)}</select></label>)}
    <label className="min-w-0 text-sm font-medium">Availability<select aria-label="Availability" value={options.availability} onChange={e => update("availability",e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-2 text-base"><option value="">All availability</option><option value="in_stock">In stock</option><option value="preorder">Preorder</option><option value="out_of_stock">Out of stock</option></select></label>
    <label className="min-w-0 text-sm font-medium">Sort<select aria-label="Sort" value={options.sort} onChange={e => update("sort",e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-2 text-base"><option value="relevance">Relevance</option><option value="newest">Newest</option><option value="name">Name A–Z</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label>
  </div>;
}
