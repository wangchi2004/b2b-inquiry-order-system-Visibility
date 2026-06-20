export function normalizeCustomerEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidCustomerEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
