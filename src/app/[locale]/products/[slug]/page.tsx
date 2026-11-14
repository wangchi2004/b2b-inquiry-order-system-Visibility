import Link from "next/link";
import { notFound } from "next/navigation";
import { ShopHeader } from "@/components/storefront/ShopNavigation";
import { ProductDetailView } from "@/components/storefront/ProductDetailView";
import { getProductDetail } from "@/lib/productDetail";

export const dynamic = "force-dynamic";
export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const result = await getProductDetail(slug, locale);
  if (result.status === "not_found") notFound();
  return <main className="min-h-screen bg-white"><ShopHeader locale={locale} />{result.status === "found" ? <ProductDetailView key={result.product.id} product={result.product} locale={locale} /> : <section className="mx-auto max-w-xl px-4 py-12"><h1 className="text-2xl font-semibold">Product temporarily unavailable</h1><p role="alert" className="mt-3 leading-7 text-slate-600">We could not load this product. Please retry in a moment.</p><Link href={`/${locale}/products/${encodeURIComponent(slug)}`} className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-blue-700 px-5 font-medium text-white">Retry</Link><Link href={`/${locale}/search`} className="ml-4 inline-flex min-h-12 items-center text-blue-700">Browse products</Link></section>}</main>;
}
