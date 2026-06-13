import { createSupabaseAdminClient } from "@/lib/supabase";
import type { ProductVariant, ProductWithVariants } from "@/lib/types";

export async function getAdminProducts() {
  const supabase = createSupabaseAdminClient();
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (productsError) {
    throw new Error(`Failed to load products: ${productsError.message}`);
  }

  const productRows = (products ?? []) as Omit<ProductWithVariants, "product_variants">[];
  const productIds = productRows.map((product) => product.id);

  if (productIds.length === 0) {
    return [];
  }

  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("*")
    .in("product_id", productIds)
    .order("sku", {
      ascending: true
    });

  if (variantsError) {
    throw new Error(`Failed to load product variants: ${variantsError.message}`);
  }

  const variantsByProductId = new Map<string, ProductVariant[]>();

  for (const variant of (variants ?? []) as ProductVariant[]) {
    const productVariants = variantsByProductId.get(variant.product_id) ?? [];
    productVariants.push(variant);
    variantsByProductId.set(variant.product_id, productVariants);
  }

  return productRows.map((product) => ({
    ...product,
    product_variants: variantsByProductId.get(product.id) ?? []
  }));
}
