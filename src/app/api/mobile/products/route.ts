import { accountUser } from "@/lib/accountSession";
import { getActiveProductsWithVariants } from "@/lib/products";
import { mobileFailure, mobileJson, MobileError, mobileUser } from "@/lib/mobileApi";
export async function GET(request: Request) {
  try {
    let canViewPrices = Boolean(await accountUser());
    if (request.headers.has("authorization")) {
      try { await mobileUser(request); canViewPrices = true; }
      catch (error) { if (!(error instanceof MobileError) || error.status !== 401) throw error; }
    }
    const result = await getActiveProductsWithVariants("en");
    if (result.error) throw new MobileError(503, "SERVICE_UNAVAILABLE");
    return mobileJson({
      products: result.products.map((p) => ({
        id: p.id,
        name: p.translated_name || p.name,
        category: p.translated_category || p.category || "",
        description: p.translated_description || p.description || "",
        images: [p.image_url, p.image_url_2, p.image_url_3].filter(Boolean),
        variants: p.product_variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          unit: v.unit,
          price: canViewPrices ? v.price : null,
          stock: v.stock_status,
          dimensionImageUrl: v.dimension_image_url ?? null,
        })),
      })),
    });
  } catch (error) {
    return mobileFailure(error);
  }
}
