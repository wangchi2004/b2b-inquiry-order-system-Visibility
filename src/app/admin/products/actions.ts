"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin";
import { normalizeProductCategory } from "@/lib/productCategories";
import { uploadProductImageToR2 } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function saveProduct(formData: FormData) {
  const password = readString(formData.get("password"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/products");
  }

  const productId = readString(formData.get("product_id"));
  const productName = readString(formData.get("name"));
  const submittedSlug = readString(formData.get("slug"));
  const slug = productId
    ? submittedSlug
    : await buildUniqueProductSlug(productName, productId);
  const payload = {
    name: productName,
    slug,
    category: normalizeNullableCategory(formData.get("category")),
    description: nullableString(formData.get("description")),
    image_url: nullableString(formData.get("image_url")),
    image_url_2: nullableString(formData.get("image_url_2")),
    image_url_3: nullableString(formData.get("image_url_3")),
    material: nullableString(formData.get("material")),
    color: nullableString(formData.get("color")),
    status: readStatus(formData.get("status"))
  };

  if (!payload.name || !payload.slug) {
    redirect(adminProductsPath(password, "Product name is required."));
  }

  try {
    const uploadedImages = await uploadProductImages(
      formData,
      payload.name,
      slug,
      payload.category
    );
    payload.image_url = uploadedImages.image_url ?? payload.image_url;
    payload.image_url_2 = uploadedImages.image_url_2 ?? payload.image_url_2;
    payload.image_url_3 = uploadedImages.image_url_3 ?? payload.image_url_3;
  } catch (error) {
    redirect(
      adminProductsPath(
        password,
        error instanceof Error ? error.message : "Failed to upload product image."
      )
    );
  }

  const supabase = createSupabaseAdminClient();
  const { error } = productId
    ? await supabase.from("products").update(payload).eq("id", productId)
    : await supabase.from("products").insert(payload);

  if (error) {
    redirect(adminProductsPath(password, error.message));
  }

  revalidatePath("/admin/products");
  revalidatePath("/order/[token]", "page");
  redirect(adminProductsPath(password));
}

async function buildUniqueProductSlug(productName: string, productId?: string) {
  const baseSlug = slugifySkuPart(productName) || "product";
  const supabase = createSupabaseAdminClient();

  for (let index = 1; index <= 100; index += 1) {
    const candidate = index === 1 ? baseSlug : `${baseSlug}-${index}`;
    const query = supabase
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .limit(1);
    const { data, error } = productId
      ? await query.neq("id", productId)
      : await query;

    if (error) {
      throw new Error(error.message);
    }

    if (data.length === 0) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique product slug.");
}

async function uploadProductImages(
  formData: FormData,
  productName: string,
  slug: string,
  category: string | null
) {
  const imageFields: Array<{
    fileField: string;
    imageField: "image_url" | "image_url_2" | "image_url_3";
    imageSlot: "main" | "secondary-1" | "secondary-2";
  }> = [
    {
      fileField: "image_file",
      imageField: "image_url",
      imageSlot: "main" as const
    },
    {
      fileField: "image_file_2",
      imageField: "image_url_2",
      imageSlot: "secondary-1" as const
    },
    {
      fileField: "image_file_3",
      imageField: "image_url_3",
      imageSlot: "secondary-2" as const
    }
  ];
  const uploadedImages: Partial<Record<"image_url" | "image_url_2" | "image_url_3", string>> = {};

  for (const field of imageFields) {
    const file = formData.get(field.fileField);

    if (!(file instanceof File) || file.size === 0) {
      continue;
    }

    uploadedImages[field.imageField] = await uploadProductImageToR2({
      file,
      productName,
      productSlug: slug,
      category,
      imageSlot: field.imageSlot
    }) ?? undefined;
  }

  return uploadedImages;
}

export async function toggleProductStatus(formData: FormData) {
  const password = readString(formData.get("password"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/products");
  }

  const productId = readString(formData.get("product_id"));
  const status = readStatus(formData.get("status"));

  if (!productId) {
    redirect(adminProductsPath(password, "Product ID is required."));
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("products")
    .update({
      status
    })
    .eq("id", productId);

  if (error) {
    redirect(adminProductsPath(password, error.message));
  }

  revalidatePath("/admin/products");
  revalidatePath("/order/[token]", "page");
  redirect(adminProductsPath(password));
}

export async function deleteProduct(formData: FormData) {
  const password = readString(formData.get("password"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/products");
  }

  const productId = readString(formData.get("product_id"));

  if (!productId) {
    redirect(adminProductsPath(password, "Product ID is required."));
  }

  const supabase = createSupabaseAdminClient();
  const { error: orderItemsError } = await supabase
    .from("order_items")
    .update({
      product_id: null,
      variant_id: null
    })
    .eq("product_id", productId);

  if (orderItemsError) {
    redirect(adminProductsPath(password, orderItemsError.message));
  }

  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    redirect(adminProductsPath(password, error.message));
  }

  revalidatePath("/admin/products");
  revalidatePath("/order/[token]", "page");
  redirect(adminProductsPath(password));
}

export async function saveProductVariant(formData: FormData) {
  const password = readString(formData.get("password"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/products");
  }

  const variantId = readString(formData.get("variant_id"));
  const productId = readString(formData.get("product_id"));
  const productSlug = readString(formData.get("product_slug")) || productId;
  const size = nullableString(formData.get("size"));
  const color = nullableString(formData.get("color"));
  const sku = buildVariantSku(productSlug, size, color);
  const payload = {
    product_id: productId,
    sku,
    size,
    color,
    unit: readString(formData.get("unit")) || "piece",
    price: nullableNumber(formData.get("price")),
    stock_status: readStockStatus(formData.get("stock_status"))
  };

  if (!payload.product_id || !payload.sku) {
    redirect(adminProductsPath(password, "Product, size, or color is required to generate SKU."));
  }

  const supabase = createSupabaseAdminClient();
  const duplicateQuery = supabase
    .from("product_variants")
    .select("id")
    .eq("sku", payload.sku)
    .limit(1);
  const { data: duplicateVariants, error: duplicateError } = variantId
    ? await duplicateQuery.neq("id", variantId)
    : await duplicateQuery;

  if (duplicateError) {
    redirect(adminProductsPath(password, duplicateError.message));
  }

  if (duplicateVariants.length > 0) {
    redirect(
      adminProductsPath(
        password,
        `SKU "${payload.sku}" already exists. Please edit the existing specification or use a new SKU.`
      )
    );
  }

  const { error } = variantId
    ? await supabase.from("product_variants").update(payload).eq("id", variantId)
    : await supabase.from("product_variants").insert(payload);

  if (error) {
    redirect(adminProductsPath(password, productVariantErrorMessage(error, payload.sku)));
  }

  revalidatePath("/admin/products");
  revalidatePath("/order/[token]", "page");
  redirect(adminProductsPath(password));
}

export async function deleteProductVariant(formData: FormData) {
  const password = readString(formData.get("password"));
  const access = checkAdminAccess(password);

  if (!access.ok) {
    redirect("/admin/products");
  }

  const variantId = readString(formData.get("variant_id"));

  if (!variantId) {
    redirect(adminProductsPath(password, "Specification ID is required."));
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId);

  if (error) {
    redirect(adminProductsPath(password, error.message));
  }

  revalidatePath("/admin/products");
  revalidatePath("/order/[token]", "page");
  redirect(adminProductsPath(password));
}

function adminProductsPath(password: string, message?: string) {
  const params = new URLSearchParams({
    password
  });

  if (message) {
    params.set("message", message);
  }

  return `/admin/products?${params.toString()}`;
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: FormDataEntryValue | null) {
  const text = readString(value);

  return text || null;
}

function normalizeNullableCategory(value: FormDataEntryValue | null) {
  const text = readString(value);
  const normalizedCategory = normalizeProductCategory(text);

  return normalizedCategory || null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const text = readString(value);

  if (!text) {
    return null;
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

function readStatus(value: FormDataEntryValue | null) {
  return readString(value) === "inactive" ? "inactive" : "active";
}

function readStockStatus(value: FormDataEntryValue | null) {
  const text = readString(value);

  return text || "in_stock";
}

function buildVariantSku(productSlug: string, size: string | null, color: string | null) {
  const parts = [
    productSlug,
    size,
    color
  ]
    .map((part) => slugifySkuPart(part ?? ""))
    .filter(Boolean);

  return parts.join("-").toUpperCase();
}

function slugifySkuPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function productVariantErrorMessage(error: { code?: string; message: string }, sku: string) {
  if (
    error.code === "23505" ||
    error.message.includes("product_variants_sku_key")
  ) {
    return `SKU "${sku}" already exists. Please edit the existing specification or use a new SKU.`;
  }

  return error.message;
}
