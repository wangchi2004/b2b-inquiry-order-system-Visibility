const languagePattern = /^\/(en|zh|ja|ko)(?=\/|$)/;
export function languagePath(pathname: string, search: string, hash: string, locale: string) {
  if (!['en', 'zh', 'ja', 'ko'].includes(locale)) return pathname + search + hash;
  const localized = (path: string) => {
    if (languagePattern.test(path)) return path.replace(languagePattern, `/${locale}`);
    if (path === '/samples') return `/${locale}/search`;
    if (path === '/sample-catalog') return `/${locale}/catalog`;
    if (path === '/' || path === '/cart' || path === '/catalog' || path.startsWith('/order/')) return `/${locale}${path === '/' ? '' : path}`;
    return `/${locale}`;
  };
  const params = new URLSearchParams(search);
  const next = params.get('next');
  if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) {
    const url = new URL(next, 'https://local.invalid');
    params.set('next', localized(url.pathname) + url.search);
  }
  const query = params.toString();
  return localized(pathname) + (query ? `?${query}` : '') + hash;
}
