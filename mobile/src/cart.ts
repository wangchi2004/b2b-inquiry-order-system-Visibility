import type { Line } from "./types";
export function restoreCart(value: unknown): Line[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (l): l is Line =>
      !!l &&
      typeof l.variantId === "string" &&
      typeof l.name === "string" &&
      typeof l.sku === "string" &&
      typeof l.unit === "string" &&
      Number.isSafeInteger(l.quantity) &&
      l.quantity > 0 &&
      l.quantity <= 100000 &&
      typeof l.unitPrice === "number" &&
      Number.isFinite(l.unitPrice) &&
      l.unitPrice >= 0,
  );
}
export function mergeGuestCart(account: Line[], guest: Line[]): Line[] {
  const result = account.map((l) => ({ ...l }));
  for (const line of guest) {
    const existing = result.find((l) => l.variantId === line.variantId);
    if (existing)
      existing.quantity = Math.min(100000, existing.quantity + line.quantity);
    else result.push({ ...line });
  }
  return result;
}
