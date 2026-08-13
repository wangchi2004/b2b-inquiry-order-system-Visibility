"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function saveCatalogCategory(formData: FormData) {
  const access = requireAdmin(formData);
  const categoryId = nullableString(formData.get("category_id"));
  const name = readString(formData.get("name"));
  const slug = slugify(readString(formData.get("slug")) || name);
  const status = readString(formData.get("status")) === "inactive"
    ? "inactive"
    : "active";

  if (!name || !slug) {
    redirectToCategories(access.password, "English name and slug are required.", categoryId);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("save_catalog_category", {
    p_category_id: categoryId,
    p_name: name,
    p_slug: slug,
    p_parent_id: nullableString(formData.get("parent_id")),
    p_sort_order: readInteger(formData.get("sort_order")),
    p_status: status,
    p_name_zh: readString(formData.get("name_zh")),
    p_name_ko: readString(formData.get("name_ko")),
    p_name_ja: readString(formData.get("name_ja"))
  });

  if (error || !data) {
    redirectToCategories(
      access.password,
      categoryErrorMessage(error?.message),
      categoryId
    );
  }

  revalidateCatalogPaths();
  redirectToCategories(access.password, "Category saved. / 分类已保存。", data);
}

export async function deleteCatalogCategory(formData: FormData) {
  const access = requireAdmin(formData);
  const categoryId = readString(formData.get("category_id"));

  if (!categoryId) {
    redirectToCategories(access.password, "Category ID is required.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("delete_catalog_category", {
    p_category_id: categoryId,
    p_replacement_category_id: nullableString(
      formData.get("replacement_category_id")
    )
  });

  if (error) {
    redirectToCategories(
      access.password,
      categoryErrorMessage(error.message),
      categoryId
    );
  }

  revalidateCatalogPaths();
  redirectToCategories(access.password, "Category deleted. / 分类已删除。");
}

function requireAdmin(formData: FormData) {
  const access = checkAdminAccess(readString(formData.get("password")));

  if (!access.ok) {
    redirect("/admin/categories?message=Invalid+admin+password");
  }

  return access;
}

function revalidateCatalogPaths() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/samples");
  revalidatePath("/order/[token]", "page");
  revalidatePath("/[locale]/order/[token]", "page");
}

function redirectToCategories(
  password: string,
  message: string,
  categoryId?: string | null
): never {
  const query = new URLSearchParams({ password, message });

  if (categoryId) {
    query.set("category", categoryId);
  }

  redirect(`/admin/categories?${query.toString()}`);
}

function categoryErrorMessage(message?: string) {
  if (!message) return "Category operation failed.";
  if (message.includes("CATEGORY_HAS_CHILDREN")) {
    return "Move or delete child categories first. / 请先移动或删除子分类。";
  }
  if (message.includes("REPLACEMENT_CATEGORY_REQUIRED")) {
    return "Choose a replacement category for assigned products. / 请为已有产品选择迁移分类。";
  }
  if (message.includes("CATEGORY_CYCLE_NOT_ALLOWED")) {
    return "A category cannot be moved inside its own descendants. / 分类不能移动到自己的子级中。";
  }
  if (message.includes("duplicate key")) {
    return "Category name or slug already exists. / 分类名称或链接标识已存在。";
  }
  return message;
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readInteger(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(readString(value), 10);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function nullableString(value: FormDataEntryValue | null) {
  return readString(value) || null;
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}
