import { createSupabaseAdminClient, createSupabaseServerClient, hasSupabaseAdminConfig, hasSupabasePublicConfig } from "@/lib/supabase";
import type { ProductWithVariants } from "@/lib/types";

export type ProductDetail = ProductWithVariants & { galleryImages: string[]; size: string | null };
type DetailRow = ProductWithVariants & {
  size: string | null;
  categories: { name: string } | null;
  product_translations: { locale: string; name: string; description: string | null }[];
};
type DetailResult = { status: "found"; product: ProductDetail } | { status: "not_found" | "unavailable" };

export async function getProductDetail(slug: string, locale: string): Promise<DetailResult> {
  if (!slug || slug.length > 300) return { status: "not_found" };
  if (!hasSupabasePublicConfig()) return { status: "unavailable" };
  try {
    const db = hasSupabaseAdminConfig() ? createSupabaseAdminClient() : createSupabaseServerClient();
    // A single product query, with an explicit public-field projection and bounded read time.
    const { data, error } = await db.from("products").select(`
      id,name,slug,category_id,category,description,material,color,size,moq,currency,status,
      image_url,image_url_2,image_url_3,created_at,updated_at,
      categories(name),
      product_variants(id,product_id,sku,size,color,unit,price,stock_status,dimension_image_url,created_at,updated_at),
      product_translations(locale,name,description)
    `).eq("slug", slug).eq("status", "active").abortSignal(AbortSignal.timeout(12000)).maybeSingle();
    if (error) return { status: "unavailable" };
    if (!data) return { status: "not_found" };
    const { categories, product_translations, ...product } = data as unknown as DetailRow;
    const translation = product_translations.find(t => t.locale === locale) ?? product_translations.find(t => t.locale === "en");
    // Legacy product image fields remain usable when this optional table lacks grants.
    const { data: extraImages } = await db.from("product_images")
      .select("image_url,sort_order").eq("product_id", product.id)
      .order("sort_order").abortSignal(AbortSignal.timeout(4000));
    const galleryImages = [...new Set([
      product.image_url, product.image_url_2, product.image_url_3,
      ...(extraImages ?? []).map(i => i.image_url),
    ].filter((url): url is string => Boolean(url)))];
    return { status: "found", product: {
      ...product,
      category: categories?.name || product.category,
      translated_name: translation?.name || product.name,
      translated_description: translation?.description ?? product.description,
      galleryImages,
      product_variants: [...product.product_variants].sort((a, b) => (a.size ?? a.sku).localeCompare(b.size ?? b.sku, "en", { numeric: true })),
    } };
  } catch { return { status: "unavailable" }; }
}
