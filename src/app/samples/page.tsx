import Link from "next/link";
import { Header } from "@/components/Header";
import { ProductCatalog } from "@/components/ProductCatalog";
import { getActiveProductsWithVariants } from "@/lib/products";

type SamplePageProps = {
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
};

export default async function SamplePage({ searchParams }: SamplePageProps) {
  const { category, q } = await searchParams;
  const { products, error } = await getActiveProductsWithVariants("en");

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Product samples</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              Sample Catalog
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Browse product images, descriptions, and specifications. This page
              is for sample viewing only and does not show prices.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-800"
          >
            Back Home
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
              No products available
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Add active products in Supabase to show them on this sample page.
            </p>
          </div>
        ) : null}
        {products.length > 0 ? (
          <ProductCatalog
            products={products}
            basePath="/samples"
            selectedCategory={category ?? "all"}
            searchQuery={q ?? ""}
            mode="sample"
            labels={{
              productCard: {
                viewDetails: "View Details",
                product: "Product",
                color: "Color",
                material: "Material",
                moq: "MOQ",
                sizeRange: "Size Range",
                specifications: "Specifications",
                size: "Size",
                unit: "Unit",
                sku: "SKU",
                noVariants: "No variants available for this product."
              }
            }}
          />
        ) : null}
      </section>
    </main>
  );
}
