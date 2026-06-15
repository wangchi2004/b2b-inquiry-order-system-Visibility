import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { LocaleSessionSync } from "@/components/LocaleSessionSync";
import { ProductCatalog } from "@/components/ProductCatalog";
import { getActiveProductsWithVariants } from "@/lib/products";

type LocalizedSamplePageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
};

export default async function LocalizedSamplePage({
  params,
  searchParams
}: LocalizedSamplePageProps) {
  const [{ locale }, { category, q }] = await Promise.all([params, searchParams]);
  const common = await getTranslations("Common");
  const catalog = await getTranslations("Catalog");
  const samples = await getTranslations("Samples");
  const staticCategoryNames = catalog.raw("categoryNames") as Record<string, string>;
  const { products, categoryTranslations, error } =
    await getActiveProductsWithVariants(locale);

  return (
    <main className="min-h-screen">
      <LocaleSessionSync locale={locale} />
      <Header
        homeHref={`/${locale}`}
        cartHref={`/${locale}/cart`}
        labels={{
          siteName: common("siteName"),
          cart: common("cart")
        }}
      />
      <section className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">{samples("eyebrow")}</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              {samples("title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {samples("description")}
            </p>
          </div>
          <Link
            href={`/${locale}`}
            className="inline-flex h-11 items-center justify-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-800"
          >
            {common("home")}
          </Link>
        </div>

        {error ? (
          <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {error}
          </div>
        ) : null}
        {!error && products.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-950">
              {catalog("noMatchingProducts")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {catalog("tryAnother")}
            </p>
          </div>
        ) : null}
        {products.length > 0 ? (
          <ProductCatalog
            products={products}
            basePath={`/${locale}/samples`}
            selectedCategory={category ?? "all"}
            searchQuery={q ?? ""}
            mode="sample"
            labels={{
              categories: catalog("categories"),
              all: catalog("all"),
              search: common("search"),
              clear: common("clear"),
              searchPlaceholder: catalog("searchPlaceholder"),
              showing: catalog("showing", {
                filtered: "{filtered}",
                total: "{total}"
              }),
              noMatchingProducts: catalog("noMatchingProducts"),
              tryAnother: catalog("tryAnother"),
              categoryNames: {
                ...categoryTranslations,
                ...staticCategoryNames
              },
              productCard: {
                viewDetails: common("viewDetails"),
                product: common("product"),
                color: catalog("color"),
                material: catalog("material"),
                moq: catalog("moq"),
                sizeRange: catalog("sizeRange"),
                specifications: samples("specifications"),
                size: common("size"),
                unit: samples("unit"),
                sku: samples("sku"),
                noVariants: catalog("noVariants")
              }
            }}
          />
        ) : null}
      </section>
    </main>
  );
}
