import { accountUser } from "@/lib/accountSession";
import { productForViewer } from "@/lib/priceVisibility";
import { getActiveProductsWithVariants } from "@/lib/products";
import { createSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";
import type { ProductWithVariants } from "@/lib/types";


export async function getStorefrontData(locale: string) {
  const [catalog, popularIds, user] = await Promise.all([
    getActiveProductsWithVariants(locale), getPopularProductIds(), accountUser(),
  ]);
  // Only serialize public catalog fields; future cost/admin columns must not leak.
  const products: ProductWithVariants[] = catalog.products.map(p => ({
    id: p.id, name: p.name, slug: p.slug, category: p.category, category_id: p.category_id,
    description: p.description, image_url: p.image_url, image_url_2: p.image_url_2,
    image_url_3: p.image_url_3, material: p.material, color: p.color, status: p.status,
    created_at: p.created_at, updated_at: p.updated_at,
    moq: p.moq, currency: p.currency, size: p.size,
    translated_name: p.translated_name, translated_description: p.translated_description,
    translated_category: p.translated_category,
    product_variants: p.product_variants.map(v => ({
      id: v.id, product_id: v.product_id, sku: v.sku, size: v.size, color: v.color,
      unit: v.unit, price: v.price, stock_status: v.stock_status,
      dimension_image_url: v.dimension_image_url,
      created_at: v.created_at, updated_at: v.updated_at,
    })),
  }));
  return { products: products.map(p => productForViewer(p, Boolean(user))), canViewPrices: Boolean(user), popularIds, categoryTree: catalog.categoryTree, error: Boolean(catalog.error) };
}

async function getPopularProductIds(): Promise<string[]> {
  if (!hasSupabaseAdminConfig()) return [];
  try {
    // Aggregate privately; no customer, order ID or quantity is sent to the browser.
    const { data, error } = await createSupabaseAdminClient().from("order_items")
      .select("product_id,quantity").order("created_at", { ascending: false }).limit(1000);
    if (error) return [];
    const counts = new Map<string, number>();
    for (const item of data ?? []) {
      if (item.product_id) counts.set(item.product_id, (counts.get(item.product_id) ?? 0) + item.quantity);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  } catch { return []; }
}
