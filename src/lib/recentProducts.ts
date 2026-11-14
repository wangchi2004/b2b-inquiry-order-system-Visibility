export const RECENT_PRODUCTS_KEY = "shop-recent-products-v1";
export const RECENT_PRODUCTS_EVENT = "shop-recent-products-updated";
export function readRecentProducts(): string[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(RECENT_PRODUCTS_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string").slice(0, 8) : [];
  } catch { return []; }
}
export function recordRecentProduct(id: string) {
  try {
    window.localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify([id, ...readRecentProducts().filter(item => item !== id)].slice(0, 8)));
    window.dispatchEvent(new Event(RECENT_PRODUCTS_EVENT));
  } catch { /* Browsing still works when storage is blocked. */ }
}
