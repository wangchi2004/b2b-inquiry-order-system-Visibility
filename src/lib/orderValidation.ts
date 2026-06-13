import type { CartLineItem, OrderCustomerInput, OrderSubmissionInput } from "@/lib/types";

export type OrderValidationResult =
  | {
      ok: true;
      data: OrderSubmissionInput;
    }
  | {
      ok: false;
      message: string;
      field?: keyof OrderCustomerInput | "items";
    };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORTED_LOCALES = new Set(["en", "ko", "ja", "zh"]);

export function validateOrderSubmission(value: unknown): OrderValidationResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      message: "Invalid order payload."
    };
  }

  if (!isRecord(value.customer)) {
    return {
      ok: false,
      message: "Customer information is required."
    };
  }

  const customer = normalizeCustomer(value.customer);

  if (!customer.email) {
    return {
      ok: false,
      field: "email",
      message: "Email is required."
    };
  }

  if (!EMAIL_PATTERN.test(customer.email)) {
    return {
      ok: false,
      field: "email",
      message: "Please enter a valid email address."
    };
  }

  if (!customer.country) {
    return {
      ok: false,
      field: "country",
      message: "Country is required."
    };
  }

  const items = normalizeOrderItems(value.items);

  if (items.length === 0) {
    return {
      ok: false,
      field: "items",
      message: "Your cart is empty."
    };
  }

  return {
    ok: true,
    data: {
      customer,
      items,
      token: optionalString(value.token),
      locale: normalizeLocale(value.locale)
    }
  };
}

function normalizeLocale(value: unknown) {
  const locale = readString(value).toLowerCase();

  return SUPPORTED_LOCALES.has(locale) ? locale : "en";
}

function normalizeCustomer(value: Record<string, unknown>): OrderCustomerInput {
  return {
    email: readString(value.email).toLowerCase(),
    country: readString(value.country),
    whatsapp: optionalString(value.whatsapp),
    name: optionalString(value.name),
    company: optionalString(value.company),
    note: optionalString(value.note),
    inquiryImageUrls: normalizeInquiryImageUrls(value.inquiryImageUrls)
  };
}

function normalizeInquiryImageUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const urls = value
    .map((item) => optionalString(item))
    .filter((item): item is string => Boolean(item))
    .filter(isAllowedUrl)
    .slice(0, 3);

  return urls.length > 0 ? urls : undefined;
}

function normalizeOrderItems(value: unknown): CartLineItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: CartLineItem[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const productId = readString(item.productId);
    const variantId = optionalString(item.variantId);
    const productName = readString(item.productName);
    const sku = readString(item.sku);
    const quantity = Math.max(0, Math.floor(Number(item.quantity)) || 0);

    if (!productId || !variantId || !productName || !sku || quantity < 1) {
      continue;
    }

    items.push({
      productId,
      variantId,
      productName,
      sku,
      size: optionalString(item.size),
      color: optionalString(item.color),
      unit: optionalString(item.unit),
      quantity
    });
  }

  return items;
}

function optionalString(value: unknown) {
  const stringValue = readString(value);

  return stringValue || undefined;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAllowedUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
