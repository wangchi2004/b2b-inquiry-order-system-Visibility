'use client';
import { useRouter } from 'next/navigation';
import { languagePath } from '@/lib/languagePath';
import { setCartLocale } from '@/lib/cart';

export function LanguageSwitcher({ locale }: { locale: string }) {
  const router = useRouter();
  const label = ({ en: 'Language', zh: '网站语言', ja: '言語', ko: '언어' } as Record<string, string>)[locale] ?? 'Language';
  return <label className="flex items-center gap-2 text-sm font-medium text-slate-600"><span className="sr-only">{label}</span><select aria-label={label} value={locale} onChange={event => {
    const language = event.target.value;
    try { setCartLocale(language); } catch { /* Language navigation works without browser storage. */ }
    router.push(languagePath(window.location.pathname, window.location.search, window.location.hash, language));
  }} className="min-h-11 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 focus:border-blue-600 focus:outline-blue-600">
    <option value="zh" lang="zh">中文</option><option value="en" lang="en">English</option><option value="ja" lang="ja">日本語</option><option value="ko" lang="ko">한국어</option>
  </select></label>;
}
