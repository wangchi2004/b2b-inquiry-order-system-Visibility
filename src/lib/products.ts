import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  hasSupabaseAdminConfig,
  hasSupabasePublicConfig
} from "@/lib/supabase";
import { PRODUCT_CATEGORY_OPTIONS } from "@/lib/productCategories";
import type { ProductWithVariants } from "@/lib/types";

type ProductsResult = {
  products: ProductWithVariants[];
  categoryTranslations: Record<string, string>;
  error: string | null;
};

type ProductTranslationRow = {
  product_id: string;
  locale: string;
  name: string;
  description: string | null;
};

type CategoryTranslationRow = {
  category_id: string;
  locale: string;
  name: string;
};

export type HomeGalleryImage = {
  id: string;
  url: string;
  title: string;
};

export async function getActiveProductsWithVariants(
  locale = "en"
): Promise<ProductsResult> {
  if (!hasSupabasePublicConfig()) {
    return {
      products: [],
      categoryTranslations: {},
      error: "Supabase is not configured yet. Add environment variables to load products."
    };
  }

  const supabase = hasSupabaseAdminConfig()
    ? createSupabaseAdminClient()
    : createSupabaseServerClient();
  const { data: productData, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (productsError) {
    return {
      products: [],
      categoryTranslations: {},
      error: productsError.message
    };
  }

  const products = (productData ?? []) as Omit<ProductWithVariants, "product_variants">[];
  const productIds = products.map((product) => product.id);

  if (productIds.length === 0) {
    return {
      products: [],
      categoryTranslations: {},
      error: null
    };
  }

  const { data: variantData, error: variantsError } = await supabase
    .from("product_variants")
    .select("*")
    .in("product_id", productIds);

  if (variantsError) {
    return {
      products: [],
      categoryTranslations: {},
      error: variantsError.message
    };
  }

  const variantsByProductId = new Map<string, ProductWithVariants["product_variants"]>();

  for (const variant of variantData ?? []) {
    const variants = variantsByProductId.get(variant.product_id) ?? [];
    variants.push(variant);
    variantsByProductId.set(variant.product_id, variants);
  }

  const [productTranslations, categoryTranslations] = await Promise.all([
    getProductTranslations(productIds, locale),
    getCategoryTranslations(products, locale)
  ]);

  const productsWithVariants = products.map((product) => {
    const translatedProduct = productTranslations.get(product.id);
    const translatedCategory = product.category
      ? categoryTranslations.get(product.category)
      : undefined;

    return {
      ...product,
      translated_name: translatedProduct?.name ?? product.name,
      translated_description: translatedProduct?.description ?? product.description,
      translated_category: translatedCategory ?? product.category,
      product_variants: [...(variantsByProductId.get(product.id) ?? [])].sort(compareVariants)
    };
  });

  return {
    products: productsWithVariants,
    categoryTranslations: Object.fromEntries(categoryTranslations.entries()),
    error: null
  };
}

export async function getHomeGalleryImages(limit = 24): Promise<HomeGalleryImage[]> {
  if (!hasSupabasePublicConfig()) {
    return [];
  }

  const supabase = hasSupabaseAdminConfig()
    ? createSupabaseAdminClient()
    : createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,image_url,image_url_2,image_url_3")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("Home gallery images are not available", {
      error: error.message
    });
    return [];
  }

  const images: HomeGalleryImage[] = [];
  const usedUrls = new Set<string>();

  for (const product of data ?? []) {
    for (const [index, url] of [
      product.image_url,
      product.image_url_2,
      product.image_url_3
    ].entries()) {
      if (!url || usedUrls.has(url)) {
        continue;
      }

      usedUrls.add(url);
      images.push({
        id: `${product.id}-${index}`,
        url,
        title: product.name
      });

      if (images.length >= limit) {
        return images;
      }
    }
  }

  return images;
}

async function getProductTranslations(productIds: string[], locale: string) {
  if (productIds.length === 0) {
    return new Map<string, ProductTranslationRow>();
  }

  const supabase = hasSupabaseAdminConfig()
    ? createSupabaseAdminClient()
    : createSupabaseServerClient();
  const requestedLocales = Array.from(new Set([locale, "en"]));
  const { data, error } = await supabase
    .from("product_translations")
    .select("product_id,locale,name,description")
    .in("product_id", productIds)
    .in("locale", requestedLocales);

  if (error) {
    console.warn("Product translations are not available yet", {
      error: error.message
    });
    return new Map<string, ProductTranslationRow>();
  }

  return chooseTranslations<ProductTranslationRow>(
    (data ?? []) as ProductTranslationRow[],
    locale,
    (row) => row.product_id
  );
}

async function getCategoryTranslations(
  products: Array<Pick<ProductWithVariants, "category">>,
  locale: string
) {
  const categoryIds = Array.from(
    new Set([
      ...PRODUCT_CATEGORY_OPTIONS,
      ...products.map((product) => product.category).filter(Boolean)
    ])
  ) as string[];

  if (categoryIds.length === 0) {
    return new Map<string, string>();
  }

  const supabase = hasSupabaseAdminConfig()
    ? createSupabaseAdminClient()
    : createSupabaseServerClient();
  const requestedLocales = Array.from(new Set([locale, "en"]));
  const { data, error } = await supabase
    .from("category_translations")
    .select("category_id,locale,name")
    .in("category_id", categoryIds)
    .in("locale", requestedLocales);

  if (error) {
    console.warn("Category translations are not available yet", {
      error: error.message
    });
    return new Map<string, string>();
  }

  const chosenTranslations = chooseTranslations<CategoryTranslationRow>(
    (data ?? []) as CategoryTranslationRow[],
    locale,
    (row) => row.category_id
  );

  return new Map(
    Array.from(chosenTranslations.entries()).map(([categoryId, row]) => [
      categoryId,
      row.name
    ])
  );
}

function chooseTranslations<T extends { locale: string }>(
  rows: T[],
  locale: string,
  getKey: (row: T) => string
) {
  const translations = new Map<string, T>();
  const englishFallbacks = new Map<string, T>();

  for (const row of rows) {
    const key = getKey(row);

    if (row.locale === "en") {
      englishFallbacks.set(key, row);
    }

    if (row.locale === locale) {
      translations.set(key, row);
    }
  }

  for (const [key, row] of englishFallbacks.entries()) {
    if (!translations.has(key)) {
      translations.set(key, row);
    }
  }

  return translations;
}

function compareVariants(a: ProductWithVariants["product_variants"][number], b: ProductWithVariants["product_variants"][number]) {
  const aSize = a.size ?? "";
  const bSize = b.size ?? "";
  const aNumber = Number(aSize);
  const bNumber = Number(bSize);

  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    return aNumber - bNumber;
  }

  return aSize.localeCompare(bSize);
}
