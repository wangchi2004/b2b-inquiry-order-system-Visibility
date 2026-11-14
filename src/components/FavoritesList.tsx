'use client';
import Image from 'next/image';
import Link from 'next/link';
import type { ProductWithVariants } from '@/lib/types';
import { useFavorites } from './FavoritesProvider';
import { FavoriteButton } from './FavoriteButton';
import { getPriceSummary } from './ProductCard';

export function FavoritesList({ products, locale, catalogError }: { products: ProductWithVariants[]; locale: string; catalogError: boolean }) {
  const { ids, status, reload } = useFavorites();
  if (status === 'loading') return <p role="status">Loading favorites / 正在加载收藏…</p>;
  if (status === 'guest') return <Link href={`/${locale}/account`} className="text-blue-700 underline">Sign in to view favorites / 登录后查看收藏</Link>;
  if (status === 'error') return <div role="alert">Favorites unavailable / 无法加载收藏。<button onClick={() => void reload()} className="min-h-11 px-3 text-blue-700 underline">Retry / 重试</button></div>;
  if (catalogError) return <div role="alert">Products unavailable. Please refresh this page. / 商品加载失败，请刷新页面。</div>;
  if (!ids.length) return <div className="rounded-xl border border-dashed p-8 text-center"><p>Your favorites list is empty. / 还没有收藏商品。</p><Link href={`/${locale}/search`} className="mt-4 inline-flex min-h-11 items-center text-blue-700">Browse products / 浏览商品 →</Link></div>;
  const byId = new Map(products.map(p => [p.id, p]));
  return <><p className="mb-5 text-sm text-slate-500">{ids.length} favorites / 件收藏</p><ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{ids.map(id => {
    const p = byId.get(id);
    const name = p ? p.translated_name || p.name : 'Product unavailable / 商品已下架';
    return <li key={id} className="rounded-xl border border-slate-200 p-4">{p ? <Link href={`/${locale}/products/${encodeURIComponent(p.slug)}`} className="block"><div className="relative mb-3 aspect-square rounded-lg bg-slate-50">{p.image_url ? <Image src={p.image_url} alt={name} fill unoptimized sizes="(max-width: 640px) 90vw, 320px" className="object-contain p-3" /> : <span className="flex h-full items-center justify-center text-slate-500">No image</span>}</div><h2 className="min-h-11 font-semibold">{name}</h2><p className="mb-3 text-sm text-slate-500">{getPriceSummary(p, 'Ask for price').label}</p></Link> : <p className="mb-4 text-slate-500">{name}</p>}<FavoriteButton productId={id} locale={locale} name={name} /></li>;
  })}</ul></>;
}
