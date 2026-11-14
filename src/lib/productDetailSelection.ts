import type { CartLineItem, ProductVariant, ProductWithVariants } from "./types.ts";

export const MAX_DETAIL_QUANTITY = 100000;
export function minimumDetailQuantity(product: Pick<ProductWithVariants, "moq">) {
  return Number.isSafeInteger(product.moq) && Number(product.moq) > 0 ? Number(product.moq) : 1;
}
export function variantColor(product: Pick<ProductWithVariants, "color">, variant: ProductVariant) {
  return variant.color?.trim() || product.color?.trim() || "Not specified";
}
export function variantUnavailableReason(variant: ProductVariant | undefined) {
  if (!variant) return "Specifications are not available yet. Please ask us about this product.";
  if (variant.stock_status === "out_of_stock") return "This specification is out of stock.";
  if (!["in_stock", "preorder"].includes(variant.stock_status)) return "Please ask us to confirm availability.";
  if (variant.price === null || !Number.isFinite(variant.price) || variant.price < 0) return "Please ask us to confirm the price.";
  return null;
}
export function detailCartItem(product: ProductWithVariants, variantId: string, quantity: number, existingQuantity = 0): CartLineItem {
  const variant = product.product_variants.find(v => v.id === variantId && v.product_id === product.id);
  const unavailable = variantUnavailableReason(variant);
  if (product.status !== "active" || unavailable || !variant) throw new Error(unavailable || "This product is unavailable.");
  const minimum = minimumDetailQuantity(product);
  if (!Number.isSafeInteger(quantity) || quantity < minimum || quantity > MAX_DETAIL_QUANTITY) throw new Error(`Enter a whole quantity from ${minimum} to ${MAX_DETAIL_QUANTITY}.`);
  if (!Number.isSafeInteger(existingQuantity) || existingQuantity < 0 || existingQuantity + quantity > MAX_DETAIL_QUANTITY) throw new Error(`The cart limit is ${MAX_DETAIL_QUANTITY} for this specification.`);
  return {
    productId: product.id, variantId: variant.id, productName: product.translated_name || product.name,
    imageUrl: product.image_url || product.image_url_2 || product.image_url_3 || undefined,
    sku: variant.sku, size: variant.size || undefined, color: variant.color || product.color || undefined,
    unit: variant.unit, unitPrice: variant.price, quantity,
  };
}
