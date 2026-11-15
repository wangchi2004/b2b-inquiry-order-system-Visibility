export function accountReturnPath(value: unknown, locale: string) {
  const fallback = `/${locale}/catalog`;
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x1f]/.test(value)) return fallback;
  const url = new URL(value, 'https://account.local');
  return url.origin === 'https://account.local' && (url.pathname.startsWith(`/${locale}/`) || url.pathname.startsWith('/order/') || ['/cart', '/catalog', '/samples', '/sample-catalog'].includes(url.pathname))
    ? `${url.pathname}${url.search}` : fallback;
}
