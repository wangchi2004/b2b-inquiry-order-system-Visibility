'use client';
import { useState } from 'react';
import { useFavorites } from './FavoritesProvider';
import { ShopIcon } from './storefront/ShopIcon';
export function FavoriteButton({ productId, locale, compact = false, name = '' }: { productId: string; locale: string; compact?: boolean; name?: string }) {
  const { ids, status, pending, toggle } = useFavorites();
  const [error, setError] = useState<string | null>(null);
  const saved = status === 'ready' && ids.includes(productId);
  const busy = pending.has(productId);
  const label = saved ? 'Remove from Favorites / 取消收藏' : 'Add to Favorites / 加入收藏';
  return <div className={compact ? 'absolute right-1.5 top-1.5 z-10' : ''}>
    <button type="button" aria-label={`${label}${name ? `: ${name}` : ''}`} aria-pressed={saved} disabled={busy || status === 'loading'} onClick={async () => setError(await toggle(productId, locale))} className={`${compact ? 'flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-sm' : 'flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 font-medium'} ${saved ? 'text-rose-600' : 'text-slate-600'} disabled:opacity-50`}>
      <ShopIcon name="heart" fill={saved ? 'currentColor' : 'none'} width={compact ? 19 : 22} />{!compact && (busy ? '…' : label)}
    </button>
    {error && <p role="alert" className={compact ? 'absolute right-0 top-12 w-48 rounded-lg border bg-white p-3 text-sm text-red-700 shadow-lg' : 'mt-2 text-sm text-red-700'}>{error}</p>}
  </div>;
}
