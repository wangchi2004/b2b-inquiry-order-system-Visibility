import type { ProductWithVariants } from "@/lib/types";

export function matchesSearch(product: ProductWithVariants, searchQuery: string) {
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
