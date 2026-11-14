import { Storefront } from "@/components/storefront/Storefront";
import { ShopHeader } from "@/components/storefront/ShopNavigation";
import { getStorefrontData } from "@/lib/storefront";

export const dynamic = "force-dynamic";
export default async function SearchPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const [{ locale }, search] = await Promise.all([params, searchParams]);
  const data = await getStorefrontData(locale);
  return <main className="min-h-screen bg-white"><ShopHeader locale={locale} /><Storefront {...data} locale={locale} mode="search" query={typeof search.q === "string" ? search.q : ""} category={typeof search.category === "string" ? search.category : "all"} /></main>;
}
