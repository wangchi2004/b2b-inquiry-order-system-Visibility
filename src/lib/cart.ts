import type { CartLineItem, OrderCustomerInput } from "@/lib/types";

export const CART_STORAGE_KEY = "inquiry-cart";
export const CART_UPDATED_EVENT = "inquiry-cart-updated";
export const CONTINUE_SHOPPING_PATH_KEY = "inquiry-continue-shopping-path";
export const CART_LOCALE_KEY = "inquiry-locale";
export const ORDER_LINK_SESSION_KEY = "inquiry-order-link-session";
export const VISITOR_ORDER_SESSION_KEY = "inquiry-visitor-order-session";

const supportedCartLocales = new Set(["en", "ko", "ja", "zh"]);

export type OrderLinkCartSession = {
  token: string;
  status: "valid" | "expired";
  message?: string;
  customer: Partial<OrderCustomerInput>;
};

export type VisitorOrderSession = {
  email: string;
  country: string;
};

export function getCartItemCount(items: CartLineItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartItemKey(item: Pick<CartLineItem, "productId" | "variantId" | "sku">) {
  return item.variantId ?? `${item.productId}-${item.sku ?? ""}`;
}

export function readCart() {
  if (typeof window === "undefined") {
    return [];
  }

  const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);

  if (!savedCart) {
    return [];
  }

  try {
    return normalizeCartItems(JSON.parse(savedCart));
  } catch {
    return [];
  }
}

export function writeCart(items: CartLineItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizeCartItems(items)));
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

export function addCartItems(newItems: CartLineItem[]) {
  const currentCart = readCart();
  writeCart(mergeCartItems(currentCart, newItems));
}

export function updateCartItemQuantity(itemKey: string, quantity: number) {
  const safeQuantity = Math.max(0, Math.floor(quantity) || 0);
  const updatedItems = readCart()
    .map((item) =>
      getCartItemKey(item) === itemKey
        ? {
            ...item,
            quantity: safeQuantity
          }
        : item
    )
    .filter((item) => item.quantity > 0);

  writeCart(updatedItems);
}

export function removeCartItem(itemKey: string) {
  writeCart(readCart().filter((item) => getCartItemKey(item) !== itemKey));
}

export function clearCart() {
  writeCart([]);
}

export function setContinueShoppingPath(path: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CONTINUE_SHOPPING_PATH_KEY, path);
}

export function getContinueShoppingPath() {
  if (typeof window === "undefined") {
    return "/order/sample-buyer-token";
  }

  return window.localStorage.getItem(CONTINUE_SHOPPING_PATH_KEY) ?? "/order/sample-buyer-token";
}

export function setCartLocale(locale: string | undefined) {
  if (typeof window === "undefined" || !locale || !supportedCartLocales.has(locale)) {
    return;
  }

  window.localStorage.setItem(CART_LOCALE_KEY, locale);
}

export function getCartLocale() {
  if (typeof window === "undefined") {
    return null;
  }

  const locale = window.localStorage.getItem(CART_LOCALE_KEY);

  return locale && supportedCartLocales.has(locale) ? locale : null;
}

export function setOrderLinkSession(session: OrderLinkCartSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(ORDER_LINK_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(ORDER_LINK_SESSION_KEY, JSON.stringify(session));
}

export function readOrderLinkSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(ORDER_LINK_SESSION_KEY);

  if (!value) {
    return null;
  }

  try {
    return normalizeOrderLinkSession(JSON.parse(value));
  } catch {
    return null;
  }
}

export function setVisitorOrderSession(session: VisitorOrderSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(VISITOR_ORDER_SESSION_KEY, JSON.stringify(session));
}

export function readVisitorOrderSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(VISITOR_ORDER_SESSION_KEY);

  if (!value) {
    return null;
  }

  try {
    return normalizeVisitorOrderSession(JSON.parse(value));
  } catch {
    return null;
  }
}

function mergeCartItems(currentCart: CartLineItem[], newItems: CartLineItem[]) {
  const merged = new Map<string, CartLineItem>();

  for (const item of [...currentCart, ...newItems]) {
    const key = getCartItemKey(item);
    const existingItem = merged.get(key);

    if (existingItem) {
      merged.set(key, {
        ...existingItem,
        quantity: existingItem.quantity + item.quantity
      });
    } else if (item.quantity > 0) {
      merged.set(key, item);
    }
  }

  return Array.from(merged.values());
}

function normalizeCartItems(value: unknown): CartLineItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is CartLineItem => {
      return (
        typeof item === "object" &&
        item !== null &&
        "productId" in item &&
        "productName" in item &&
        "quantity" in item
      );
    })
    .map((item) => ({
      variantId: String(item.variantId),
      productId: String(item.productId),
      productName: String(item.productName),
      imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
      sku: String(item.sku),
      size: item.size ? String(item.size) : undefined,
      color: item.color ? String(item.color) : undefined,
      unit: item.unit ? String(item.unit) : undefined,
      unitPrice:
        "unitPrice" in item && item.unitPrice !== undefined && item.unitPrice !== null
          ? Number(item.unitPrice)
          : undefined,
      quantity: Math.max(0, Math.floor(Number(item.quantity)) || 0)
    }))
    .filter((item) => item.variantId && item.sku && item.quantity > 0);
}

function normalizeOrderLinkSession(value: unknown): OrderLinkCartSession | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const token = typeof record.token === "string" ? record.token : "";
  const status = record.status === "expired" ? "expired" : "valid";
  const customer =
    typeof record.customer === "object" && record.customer !== null
      ? (record.customer as Record<string, unknown>)
      : {};

  if (!token) {
    return null;
  }

  return {
    token,
    status,
    message: typeof record.message === "string" ? record.message : undefined,
    customer: {
      email: readOptionalString(customer.email),
      country: readOptionalString(customer.country),
      whatsapp: readOptionalString(customer.whatsapp),
      name: readOptionalString(customer.name),
      company: readOptionalString(customer.company)
    }
  };
}

function normalizeVisitorOrderSession(value: unknown): VisitorOrderSession | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const email = readOptionalString(record.email);
  const country = readOptionalString(record.country);

  if (!email || !country) {
    return null;
  }

  return {
    email,
    country
  };
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
