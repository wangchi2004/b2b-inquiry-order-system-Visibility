import Link from "next/link";
import { ProductCard, type ProductCardLabels } from "@/components/ProductCard";
import {
  PRODUCT_CATEGORY_TREE,
  categoryMatchesSelection,
  getCategoryAncestorNames,
  getKnownCategorySet,
  normalizeProductCategory,
  type ProductCategoryNode
} from "@/lib/productCategories";
import type { ProductWithVariants } from "@/lib/types";

type ProductCatalogProps = {
  products: ProductWithVariants[];
  basePath: string;
  selectedCategory?: string;
  searchQuery?: string;
  mode?: "order" | "sample";
  labels?: ProductCatalogLabels;
};

export type ProductCatalogLabels = {
  categories?: string;
  all?: string;
  search?: string;
  clear?: string;
  searchPlaceholder?: string;
  showing?: string;
  noMatchingProducts?: string;
  tryAnother?: string;
  productCard?: ProductCardLabels;
  categoryNames?: Record<string, string>;
};

export function ProductCatalog({
  products,
  basePath,
  selectedCategory = "all",
  searchQuery = "",
  mode = "order",
  labels
}: ProductCatalogProps) {
  const normalizedSearchQuery = searchQuery.trim();
  const filteredProducts = products.filter((product) =>
    matchesCategory(product, selectedCategory) &&
    matchesSearch(product, normalizedSearchQuery)
  );
  const categoryCounts = getCategoryCounts(products);

  return (
    <div className="grid grid-cols-[118px_minmax(0,1fr)] gap-3 sm:grid-cols-[150px_minmax(0,1fr)] lg:grid-cols-[240px_1fr] lg:gap-6">
      <aside className="sticky top-3 max-h-[calc(100vh-1.5rem)] self-start overflow-y-auto rounded border border-slate-200 bg-white p-2 sm:p-3 lg:top-6 lg:p-4">
        <CategoryNav
          basePath={basePath}
          selectedCategory={selectedCategory}
          searchQuery={normalizedSearchQuery}
          categoryCounts={categoryCounts}
          totalCount={products.length}
          labels={labels}
        />
      </aside>

      <div className="min-w-0 space-y-4 lg:space-y-5">
        <section className="rounded border border-slate-200 bg-white p-3 lg:p-4">
          <form className="grid gap-2 sm:grid-cols-[1fr_auto] lg:gap-3" action={basePath}>
            {selectedCategory !== "all" ? (
              <input type="hidden" name="category" value={selectedCategory} />
            ) : null}
            <input
              type="search"
              name="q"
              defaultValue={normalizedSearchQuery}
              placeholder={
                labels?.searchPlaceholder ??
                "Search by product, category, material, color, SKU..."
              }
              className="h-11 rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="h-11 flex-1 rounded bg-slate-950 px-3 text-sm font-semibold text-white sm:flex-none sm:px-4"
              >
                {labels?.search ?? "Search"}
              </button>
              {(normalizedSearchQuery || selectedCategory !== "all") ? (
                <Link
                  href={basePath}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded border border-slate-300 px-3 text-sm font-semibold text-slate-800 sm:flex-none sm:px-4"
                >
                  {labels?.clear ?? "Clear"}
                </Link>
              ) : null}
            </div>
          </form>
          <p className="mt-3 text-sm text-slate-600">
            {(labels?.showing ?? "Showing {filtered} of {total} products.")
              .replace("{filtered}", String(filteredProducts.length))
              .replace("{total}", String(products.length))}
          </p>
        </section>

        {filteredProducts.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-950">
              {labels?.noMatchingProducts ?? "No matching products"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {labels?.tryAnother ?? "Try another category or search keyword."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  translated_category:
                    (product.category
                      ? labels?.categoryNames?.[product.category]
                      : undefined) ??
                    product.translated_category
                }}
                mode={mode}
                labels={labels?.productCard}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryNav({
  basePath,
  selectedCategory,
  searchQuery,
  categoryCounts,
  totalCount,
  labels
}: {
  basePath: string;
  selectedCategory: string;
  searchQuery: string;
  categoryCounts: Map<string, number>;
  totalCount: number;
  labels?: ProductCatalogLabels;
}) {
  const otherCategories = getOtherCategories(categoryCounts);

  return (
    <nav className="space-y-1 text-xs sm:text-sm lg:space-y-2">
      <h2 className="mb-2 text-sm font-semibold text-slate-950 lg:mb-3 lg:text-base">
        {labels?.categories ?? "Categories"}
      </h2>
      <CategoryLink
        href={catalogHref(basePath, "all", searchQuery)}
        active={selectedCategory === "all"}
        label={labels?.all ?? "All"}
        count={totalCount}
      />
      {PRODUCT_CATEGORY_TREE.map((category) => (
        <CategoryTreeLink
          key={category.name}
          node={category}
          basePath={basePath}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          categoryCounts={categoryCounts}
          labels={labels}
        />
      ))}
      {otherCategories.length ? (
        <div className="border-t border-slate-200 pt-2">
          {otherCategories.map((category) => (
            <CategoryLink
              key={category}
              href={catalogHref(basePath, category, searchQuery)}
              active={selectedCategory === category}
              label={labels?.categoryNames?.[category] ?? category}
              count={categoryCounts.get(category) ?? 0}
            />
          ))}
        </div>
      ) : null}
    </nav>
  );
}

function CategoryLink({
  href,
  active,
  label,
  count,
  level = 0
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  level?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-1 rounded px-2 py-2 lg:px-3 ${
        active
          ? "bg-slate-950 font-semibold text-white"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span className={`min-w-0 break-words leading-snug ${level > 0 ? "text-[11px] sm:text-xs" : ""}`}>
        {level > 0 ? `${"  ".repeat(level - 1)}└─ ` : ""}
        {label}
      </span>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] lg:px-2 lg:text-xs ${
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

function CategoryTreeLink({
  node,
  basePath,
  selectedCategory,
  searchQuery,
  categoryCounts,
  level = 0,
  labels
}: {
  node: ProductCategoryNode;
  basePath: string;
  selectedCategory: string;
  searchQuery: string;
  categoryCounts: Map<string, number>;
  level?: number;
  labels?: ProductCatalogLabels;
}) {
  return (
    <div>
      <CategoryLink
        href={catalogHref(basePath, node.name, searchQuery)}
        active={selectedCategory === node.name}
        label={labels?.categoryNames?.[node.name] ?? node.name}
        count={categoryCounts.get(node.name) ?? 0}
        level={level}
      />
      {node.children?.length ? (
        <div className="mt-1 space-y-1 pl-2 sm:pl-3 lg:pl-4">
          {node.children.map((childNode) => (
            <CategoryTreeLink
              key={childNode.name}
              node={childNode}
              basePath={basePath}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              categoryCounts={categoryCounts}
              level={level + 1}
              labels={labels}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function catalogHref(basePath: string, category: string, searchQuery: string) {
  const params = new URLSearchParams();

  if (category !== "all") {
    params.set("category", category);
  }

  if (searchQuery) {
    params.set("q", searchQuery);
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function getCategoryCounts(products: ProductWithVariants[]) {
  const counts = new Map<string, number>();

  for (const product of products) {
    const category = normalizeProductCategory(product.category) || "Uncategorized";
    counts.set(category, (counts.get(category) ?? 0) + 1);

    for (const parentCategory of getCategoryAncestorNames(category)) {
      counts.set(parentCategory, (counts.get(parentCategory) ?? 0) + 1);
    }
  }

  return counts;
}

function getOtherCategories(categoryCounts: Map<string, number>) {
  const knownCategories = getKnownCategorySet();
  return Array.from(categoryCounts.keys())
    .filter((category) => !knownCategories.has(category))
    .sort((a, b) => a.localeCompare(b));
}

function matchesCategory(product: ProductWithVariants, selectedCategory: string) {
  return categoryMatchesSelection(product.category, selectedCategory);
}

function matchesSearch(product: ProductWithVariants, searchQuery: string) {
  if (!searchQuery) {
    return true;
  }

  const keyword = searchQuery.toLowerCase();
  const searchableText = [
    product.name,
    product.translated_name,
    product.slug,
    product.category,
    product.translated_category,
    product.description,
    product.translated_description,
    product.material,
    product.color,
    ...product.product_variants.flatMap((variant) => [
      variant.sku,
      variant.size,
      variant.color,
      variant.unit,
      variant.stock_status
    ])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(keyword);
}
