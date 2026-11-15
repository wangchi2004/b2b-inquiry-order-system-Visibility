"use client";

import { productForViewer } from "@/lib/priceVisibility";
import { FavoriteButton } from "@/components/FavoriteButton";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ProductCard, getPriceSummary } from "@/components/ProductCard";
import { categoryMatchesSelection } from "@/lib/productCategories";
import { parseSearchOptions, sortSearchProducts } from "@/lib/searchOptions";
import { SearchFilters } from "./SearchFilters";
import { shopCategories } from "@/lib/storefrontCategories";
import type { getStorefrontData } from "@/lib/storefront";
import type { ProductWithVariants } from "@/lib/types";
import { ShopIcon } from "./ShopIcon";
import { readRecentProducts, recordRecentProduct, RECENT_PRODUCTS_EVENT } from "@/lib/recentProducts";

type Props = Awaited<ReturnType<typeof getStorefrontData>> & {
  locale: string; mode?: "home" | "search"; query?: string; category?: string;
};
export function Storefront({ products, popularIds, categoryTree, error, locale, canViewPrices, mode = "home", query: initialQuery = "", category: initialCategory = "all" }: Props) {
  const searchParams = useSearchParams();
  const query = mode === "search" ? searchParams.get("q") || "" : initialQuery;
  const category = mode === "search" ? searchParams.get("category") || "all" : initialCategory;
  function navigateSearch(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (mode !== "search" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    window.history.pushState(null, "", href);
  }
  const options = parseSearchOptions(new URLSearchParams(searchParams.toString()));
  const searchKey = new URLSearchParams({ q: options.q, color: options.color, size: options.size, material: options.material, availability: options.availability }).toString();
  const [searchResult, setSearchResult] = useState<{ key: string; matches: { product_id: string; relevance: number }[]; failed: boolean; semanticStatus?: string }>({ key: "", matches: [], failed: false });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (mode !== "search") return;
    const controller = new AbortController();
    async function search() {
      try {
        const response = await fetch(`/api/products/search?${searchKey}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search unavailable");
        const data = await response.json();
        if (!controller.signal.aborted) setSearchResult({ key: searchKey, matches: data.matches, failed: false, semanticStatus: data.semanticStatus });
      } catch {
        if (!controller.signal.aborted) setSearchResult({ key: searchKey, matches: [], failed: true });
      }
    }
    void search();
    return () => controller.abort();
  }, [mode, searchKey, retry]);
  function updateSearch(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    window.history.pushState(null, "", `/${locale}/search?${params}`);
  }
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<ProductWithVariants | null>(null);
  const productDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    function restore() { setRecentIds(readRecentProducts()); }
    restore();
    window.addEventListener("storage", restore);
    window.addEventListener(RECENT_PRODUCTS_EVENT, restore);
    return () => {
      window.removeEventListener("storage", restore);
      window.removeEventListener(RECENT_PRODUCTS_EVENT, restore);
    };
  }, []);
  useEffect(() => {
    if (selected) productDialog.current?.showModal();
  }, [selected]);
  function viewProduct(product: ProductWithVariants) {
    setSelected(product);
    recordRecentProduct(product.id);
  }
  const popular = popularIds.flatMap(id => products.find(p => p.id === id) ?? []).slice(0, 6);
  const recent = recentIds.flatMap(id => products.find(p => p.id === id) ?? []);
  const loadingSearch = mode === "search" && searchResult.key !== searchKey;
  const ranks = new Map(searchResult.matches.map(m => [m.product_id, m.relevance]));
  const results = sortSearchProducts(products.filter(p => categoryMatchesSelection(p.category, category, categoryTree) && ranks.has(p.id)).map(p => ({
    ...p,
    product_variants: p.product_variants.filter(v =>
      (!options.color || (v.color || p.color || "").toLowerCase() === options.color.toLowerCase()) &&
      (!options.size || (v.size || p.size || "").toLowerCase() === options.size.toLowerCase()) &&
      (!options.availability || v.stock_status === options.availability)),
  })), options.sort, ranks);
  const hero = popular.find(p => p.image_url) ?? products.find(p => p.image_url);

  function grid(items: ProductWithVariants[]) {
    return <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {items.map(product => <ShopProductCard key={product.id} product={product} href={`/${locale}/products/${encodeURIComponent(product.slug)}`} onView={() => viewProduct(product)} locale={locale} canViewPrices={canViewPrices} />)}
    </div>;
  }
  return <div className="shop-surface bg-white text-slate-950">
    <div className="mx-auto max-w-6xl space-y-8 px-4 pb-10 pt-5 sm:px-6">
      {mode === "home" ? <section className="relative isolate overflow-hidden rounded-2xl bg-slate-100 p-6 sm:p-10">
        <div className="relative z-10 max-w-[72%] sm:max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">For the craft of repair</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Better materials.<br />Better repairs.</h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-600 sm:text-base">Soles, sheets and tools for your next repair. Explore our product collection.</p>
          <Link href={`/${locale}/search`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">Explore products <ShopIcon name="arrow" width="18" /></Link>
        </div>
        {hero?.image_url ? <div className="absolute -right-8 bottom-0 -z-10 h-full w-[48%] opacity-25 sm:right-0 sm:opacity-40"><Image src={hero.image_url} alt="" fill unoptimized loading="eager" sizes="(max-width: 640px) 180px, 500px" className="object-contain mix-blend-multiply" /></div> : null}
      </section> : <div><p className="text-sm text-blue-700">Our collection</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Search products</h1></div>}

      <section aria-label="Product search">
        <form action={`/${locale}/search`} onSubmit={event => {
          if (mode !== "search") return;
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const params = new URLSearchParams(searchParams.toString());
          const text = String(form.get("q") || "").trim();
          if (text) params.set("q", text); else params.delete("q");
          if (category !== "all") params.set("category", category);
          window.history.pushState(null, "", `/${locale}/search?${params}`);
        }} className="flex min-h-14 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
          <ShopIcon name="search" className="shrink-0 text-slate-400" />
          {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
          <input key={query} aria-label="Search products" type="search" maxLength={200} name="q" defaultValue={query} placeholder="Search products" className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none" />
          <button type="submit" aria-label="Submit product search" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white"><ShopIcon name="arrow" /></button>
        </form>
        <div className="mt-2 text-sm font-medium">
          <Link href={`/${locale}/search`} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-50 text-blue-700"><ShopIcon name="search" width="18" /> Search by Text</Link>
        </div>
      </section>

      <section aria-label="Shop by category">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Shop by category</h2><Link href={`/${locale}/search`} className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700">View all</Link></div>
        <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-7">
          {shopCategories.map(item => {
            const product = products.find(p => p.image_url && categoryMatchesSelection(p.category, item.category, categoryTree));
            return <Link key={item.label} href={`/${locale}/search?${new URLSearchParams({ category: item.category })}`} onClick={event => navigateSearch(event, event.currentTarget.href)} aria-current={category === item.category ? "page" : undefined} className="group flex min-w-0 flex-col items-center gap-2 text-center">
              <span className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border ${category === item.category ? "border-blue-600 bg-blue-50" : "border-slate-100 bg-slate-50 group-hover:border-blue-300"}`}>
                {product?.image_url ? <Image src={product.image_url} alt="" fill unoptimized sizes="64px" className="object-contain p-2 mix-blend-multiply" /> : <ShopIcon name="box" className="text-slate-400" />}
              </span><span className="text-sm leading-5 text-slate-700">{item.label}</span>
            </Link>;
          })}
        </div>
      </section>
      {error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Products could not be loaded. Please refresh or contact us for assistance.</p> : null}
      {mode === "search" ? <section aria-label="Search results" aria-busy={loadingSearch}>
        {!loadingSearch && query ? <p role="status" className="mb-4 text-sm text-slate-500">{searchResult.semanticStatus === "ready" ? "Keyword + semantic search" : searchResult.semanticStatus === "indexing" ? "Keyword search · semantic index is being prepared" : searchResult.semanticStatus === "unavailable" ? "Keyword results · semantic search temporarily unavailable" : "Keyword search"}</p> : null}
        <SearchFilters canViewPrices={canViewPrices} products={products} params={new URLSearchParams(searchParams.toString())} update={updateSearch} />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">{category === "all" ? "All products" : category}</h2><span className="text-sm text-slate-500">{loadingSearch ? "Searching…" : searchResult.failed || error ? "Results unavailable" : `${results.length} products`}{query ? ` for “${query}”` : ""}</span></div>
        {searchParams.size > 0 ? <Link href={`/${locale}/search`} onClick={event => navigateSearch(event, event.currentTarget.href)} className="mb-4 inline-flex min-h-11 items-center text-sm text-blue-700 underline">Clear search & filters</Link> : null}
        {searchResult.failed && !loadingSearch ? <div role="alert" className="rounded-xl bg-amber-50 p-4">Search could not be completed.<button className="ml-2 min-h-11 text-blue-700 underline" onClick={() => { setSearchResult({ key: "", matches: [], failed: false }); setRetry(n => n + 1); }}>Retry search</button></div> : null}
        {!loadingSearch && !searchResult.failed && !error ? grid(results) : null}
        {!loadingSearch && !searchResult.failed && !error && results.length === 0 ? <p className="rounded-xl bg-slate-50 p-6 text-base text-slate-600">No matching products. Try another keyword or category.</p> : null}
      </section> : <>
        <section aria-labelledby="popular-title"><SectionHeading id="popular-title" title="Popular Products" href={`/${locale}/search`} /><p className="-mt-2 mb-4 text-sm text-slate-500">Most requested in recent inquiries.</p>{grid(popular)}{!popular.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Popular products will appear as inquiries are received.</p> : null}</section>
        <section aria-labelledby="new-title"><SectionHeading id="new-title" title="New Products" href={`/${locale}/search`} />{grid(products.slice(0, 8))}{!products.length && !error ? <p className="text-sm text-slate-500">New products will appear here when available.</p> : null}</section>
        <section aria-labelledby="recent-title"><SectionHeading id="recent-title" title="Recently Viewed" />{grid(recent)}{!recent.length ? <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm leading-6 text-slate-500">Open a product to see it here. Your recently viewed products stay on this device.</div> : null}</section>
      </>}
      <div className="rounded-xl bg-blue-50 p-5 text-sm leading-6 text-slate-600"><p className="font-semibold text-slate-950">Made for B2B orders</p><p>Submit an inquiry first. We will confirm product prices and international shipping before payment.</p></div>
    </div>

    <dialog ref={productDialog} className="shop-dialog max-w-5xl" aria-label="Product preview" onClose={() => setSelected(null)}>
      <DialogClose onClose={() => productDialog.current?.close()} />
      <p className="mb-4 text-sm font-medium text-blue-700">Product preview · Select specifications for your inquiry</p>
      {selected ? <><ProductCard key={selected.id} product={productForViewer(selected, canViewPrices)} labels={canViewPrices ? undefined : { pricePending: "Sign in to view prices / 登录后查看价格" }} /><Link href={`/${locale}/products/${encodeURIComponent(selected.slug)}`} className="mt-4 flex min-h-11 items-center font-medium text-blue-700">Full product details →</Link></> : null}
      <Link href={`/${locale}/cart`} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-lg bg-blue-700 px-5 font-semibold text-white">View inquiry cart <ShopIcon name="arrow" /></Link>
    </dialog>
  </div>;
}
function DialogClose({ onClose }: { onClose: () => void }) {
  return <button type="button" onClick={onClose} aria-label="Close dialog" className="ml-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700"><ShopIcon name="close" /></button>;
}
function SectionHeading({ id, title, href }: { id: string; title: string; href?: string }) {
  return <div className="mb-4 flex min-h-11 items-center justify-between gap-2"><h2 id={id} className="text-xl font-semibold tracking-tight">{title}</h2>{href ? <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-blue-700">View all <ShopIcon name="arrow" width="16" /></Link> : null}</div>;
}
function ShopProductCard({ product, href, onView, locale, canViewPrices }: { product: ProductWithVariants; href: string; onView: () => void; locale: string; canViewPrices: boolean }) {
  const name = product.translated_name || product.name;
  const price = getPriceSummary(product, "Ask for price");
  const stocks = product.product_variants.map(v => v.stock_status);
  const stock = stocks.includes("in_stock") ? "In stock" : stocks.includes("preorder") ? "Preorder" : stocks.length && stocks.every(s => s === "out_of_stock") ? "Out of stock" : "Check availability";
  return <article className="min-w-0">
    <div className="relative overflow-hidden rounded-xl bg-slate-100">
      <Link href={href} prefetch={false} aria-label={`View ${name}`} className="relative block aspect-square w-full">
        {product.image_url ? <Image src={product.image_url} alt={name} fill unoptimized sizes="(max-width: 640px) 45vw, 260px" className="object-contain p-3 mix-blend-multiply transition-transform hover:scale-105" /> : <span className="flex h-full items-center justify-center text-sm text-slate-500">No image</span>}
      </Link>
      <FavoriteButton productId={product.id} locale={locale} name={name} compact />
    </div>
    <Link href={href} prefetch={false} className="mt-2 flex min-h-11 w-full items-center text-left text-sm font-semibold leading-5 hover:text-blue-700"><span className="line-clamp-2">{name}</span></Link>
    <p className="truncate text-sm text-slate-500" title={product.product_variants.map(v => v.sku).join(", ")}>{product.product_variants[0]?.sku || "SKU pending"}{product.product_variants.length > 1 ? " · + options" : ""}</p>
    <p className="mt-1 text-base font-semibold">{canViewPrices ? price.label : <Link href={`/${locale}/account?next=${encodeURIComponent(`/${locale}/search`)}`} className="inline-flex min-h-11 items-center text-sm text-blue-700">Sign in to view prices / 登录后查看价格</Link>}</p>
    <p className={`mt-1 text-sm ${stock === "In stock" ? "text-emerald-700" : "text-slate-500"}`}>{stock === "In stock" ? "● " : ""}{stock}</p>
    <button type="button" onClick={onView} className="mt-1 min-h-11 text-sm font-medium text-blue-700" aria-label={`Quick view ${name}`}>Quick view</button>
  </article>;
}
