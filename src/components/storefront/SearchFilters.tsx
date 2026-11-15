"use client";
import { shopText } from "@/i18n/shopText";
import type { ProductWithVariants } from "@/lib/types";
import { parseSearchOptions } from "@/lib/searchOptions";
export function SearchFilters({ products, params, update, locale, canViewPrices = false }: {
    locale: string;
    canViewPrices?: boolean;
    products: ProductWithVariants[];
    params: URLSearchParams;
    update: (key: string, value: string) => void;
}) {
    const t = (text: string) => shopText(locale, text);
    const options = parseSearchOptions(params);
    const distinct = (values: (string | null | undefined)[]) => [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    const fields = [
        { key: "category", label: t("Category"), values: distinct(products.map(p => p.category)) },
        { key: "color", label: t("Color"), values: distinct(products.flatMap(p => [p.color, ...p.product_variants.map(v => v.color || p.color)])) },
        { key: "size", label: t("Size"), values: distinct(products.flatMap(p => [p.size, ...p.product_variants.map(v => v.size)])) },
        { key: "material", label: t("Material"), values: distinct(products.map(p => p.material)) },
    ];
    return <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
    {fields.map(field => <label key={field.key} className="min-w-0 text-sm font-medium">{t(field.label)}<select aria-label={t(field.label)} value={params.get(field.key) || ""} onChange={e => update(field.key, e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-2 text-base"><option value="">{t(({ category: t("All categories"), color: t("All colors"), size: t("All sizes"), material: t("All materials") } as Record<string, string>)[field.key])}</option>{params.get(field.key) && !field.values.includes(params.get(field.key)!) ? <option value={params.get(field.key)!}>{params.get(field.key)}</option> : null}{field.values.map(v => <option key={v} value={v}>{t(v)}</option>)}</select></label>)}
    <label className="min-w-0 text-sm font-medium">{t("Availability")}<select aria-label={t("Availability")} value={options.availability} onChange={e => update("availability", e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-2 text-base"><option value="">{t("All availability")}</option><option value="in_stock">{t("In stock")}</option><option value="preorder">{t("Preorder")}</option><option value="out_of_stock">{t("Out of stock")}</option></select></label>
    <label className="min-w-0 text-sm font-medium">{t("Sort")}<select aria-label={t("Sort")} value={options.sort} onChange={e => update("sort", e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-2 text-base"><option value="relevance">{t("Relevance")}</option><option value="newest">{t("Newest")}</option><option value="name">{t("Name A\u2013Z")}</option>{canViewPrices ? <><option value="price_asc">{t("Price: low to high")}</option><option value="price_desc">{t("Price: high to low")}</option></> : null}</select></label>
  </div>;
}
