export function buildNewProductSlug(productName: string) {
  return productName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";
}

export function productCreateErrorMessage(
  error: { code?: string; message: string },
  productName: string
) {
  if (
    error.code === "23505" ||
    error.message.includes("products_slug_key") ||
    error.message.includes("products_slug_unique")
  ) {
    return `A product named "${productName}" already exists. Open the existing product instead of clicking Create again.`;
  }

  return error.message;
}
