import { createSupabaseAdminClient } from "@/lib/supabase";
import {
  PRODUCT_CATEGORY_TREE,
  flattenCategoryTree,
  type ProductCategoryNode
} from "@/lib/productCategories";

export const CATEGORY_LOCALES = ["en", "zh", "ko", "ja"] as const;
export type CategoryLocale = (typeof CATEGORY_LOCALES)[number];

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  status: "active" | "inactive";
  translations: Record<string, string>;
  directProductCount: number;
};

type CategoryRow = Omit<CatalogCategory, "translations" | "directProductCount">;

export async function getCatalogCategories(options: {
  includeInactive?: boolean;
  includeProductCounts?: boolean;
} = {}) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("categories")
    .select("id,name,slug,parent_id,sort_order,status")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!options.includeInactive) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load categories: ${error.message}`);
  }

  const rows = (data ?? []) as CategoryRow[];
  const names = rows.map((row) => row.name);
  const [{ data: translationData, error: translationError }, productResult] =
    await Promise.all([
      names.length
        ? supabase
            .from("category_translations")
            .select("category_id,locale,name")
            .in("category_id", names)
        : Promise.resolve({ data: [], error: null }),
      options.includeProductCounts
        ? supabase.from("products").select("category_id,category")
        : Promise.resolve({ data: [], error: null })
    ]);

  if (translationError) {
    throw new Error(`Failed to load category translations: ${translationError.message}`);
  }

  if (productResult.error) {
    throw new Error(`Failed to load category product counts: ${productResult.error.message}`);
  }

  const translations = new Map<string, Record<string, string>>();

  for (const row of translationData ?? []) {
    translations.set(row.category_id, {
      ...(translations.get(row.category_id) ?? {}),
      [row.locale]: row.name
    });
  }

  const counts = new Map<string, number>();

  for (const product of productResult.data ?? []) {
    const key = product.category_id || product.category;

    if (key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return rows.map((row) => ({
    ...row,
    translations: translations.get(row.name) ?? { en: row.name },
    directProductCount:
      (counts.get(row.id) ?? 0) + (counts.get(row.name) ?? 0)
  })) satisfies CatalogCategory[];
}

export function buildCategoryTree(
  categories: CatalogCategory[]
): ProductCategoryNode[] {
  const nodes = new Map<string, ProductCategoryNode>();

  for (const category of categories) {
    nodes.set(category.id, {
      id: category.id,
      name: category.name,
      slug: category.slug,
      status: category.status,
      translations: category.translations,
      children: []
    });
  }

  const roots: ProductCategoryNode[] = [];

  for (const category of categories) {
    const node = nodes.get(category.id);

    if (!node) {
      continue;
    }

    const parent = category.parent_id ? nodes.get(category.parent_id) : null;

    if (parent) {
      parent.children?.push(node);
    } else if (!category.parent_id) {
      roots.push(node);
    }
  }

  return roots;
}

export function getFallbackCategoryTree() {
  return PRODUCT_CATEGORY_TREE;
}

export function getCategoryNameMap(
  categories: CatalogCategory[],
  locale: string
) {
  return Object.fromEntries(
    categories.map((category) => [
      category.name,
      category.translations[locale] ??
        category.translations.en ??
        category.name
    ])
  );
}

export function getCategoryDescendantIds(
  categoryId: string,
  tree: ProductCategoryNode[]
) {
  const node = flattenCategoryTree(tree).find((item) => item.id === categoryId);
  return node ? flattenCategoryTree(node.children ?? []).flatMap((item) => item.id ?? []) : [];
}
