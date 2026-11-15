import type { ProductWithVariants } from './types';

// Redact on the server before passing catalog data to a client component.
export function productForViewer<T extends ProductWithVariants>(product: T, canViewPrices: boolean): T {
  return { ...product, product_variants: product.product_variants.map(variant => ({ ...variant, price: canViewPrices ? variant.price : null })) };
}
