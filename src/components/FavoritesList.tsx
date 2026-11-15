'use client';
import { shopText } from "@/i18n/shopText";
import Image from 'next/image';
import Link from 'next/link';
import type { ProductWithVariants } from '@/lib/types';
import { useFavorites } from './FavoritesProvider';
import { FavoriteButton } from './FavoriteButton';
import { getPriceSummary } from './ProductCard';
export function FavoritesList({ products, locale, catalogError }: {
    products: ProductWithVariants[];
    locale: string;
    catalogError: boolean;
}) {
    const t = (text: string) => shopText(locale, text);
    const { ids, status, reload } = useFavorites();
    if (status === 'loading')
        return <p role="status">{t("Loading favorites / \u6B63\u5728\u52A0\u8F7D\u6536\u85CF\u2026")}</p>;
    if (status === 'guest')
        return <Link href={`/${locale}/account`} className="text-blue-700 underline">{t("Sign in to view favorites / \u767B\u5F55\u540E\u67E5\u770B\u6536\u85CF")}</Link>;
    if (status === 'error')
        return <div role="alert">{t("Favorites unavailable / \u65E0\u6CD5\u52A0\u8F7D\u6536\u85CF\u3002")}<button onClick={() => void reload()} className="min-h-11 px-3 text-blue-700 underline">{t("Retry / \u91CD\u8BD5")}</button></div>;
    if (catalogError)
        return <div role="alert">{t("Products unavailable. Please refresh this page. / \u5546\u54C1\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u3002")}</div>;
    if (!ids.length)
        return <div className="rounded-xl border border-dashed p-8 text-center"><p>{t("Your favorites list is empty. / \u8FD8\u6CA1\u6709\u6536\u85CF\u5546\u54C1\u3002")}</p><Link href={`/${locale}/search`} className="mt-4 inline-flex min-h-11 items-center text-blue-700">{t("Browse products / \u6D4F\u89C8\u5546\u54C1 \u2192")}</Link></div>;
    const byId = new Map(products.map(p => [p.id, p]));
    return <><p className="mb-5 text-sm text-slate-500">{shopText(locale, "{count} favorites", { count: ids.length })}</p><ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{ids.map(id => {
            const p = byId.get(id);
            const name = p ? p.translated_name || p.name : t("Product unavailable / \u5546\u54C1\u5DF2\u4E0B\u67B6");
            return <li key={id} className="rounded-xl border border-slate-200 p-4">{p ? <Link href={`/${locale}/products/${encodeURIComponent(p.slug)}`} className="block"><div className="relative mb-3 aspect-square rounded-lg bg-slate-50">{p.image_url ? <Image src={p.image_url} alt={name} fill unoptimized sizes="(max-width: 640px) 90vw, 320px" className="object-contain p-3"/> : <span className="flex h-full items-center justify-center text-slate-500">{t("No image")}</span>}</div><h2 className="min-h-11 font-semibold">{name}</h2><p className="mb-3 text-sm text-slate-500">{getPriceSummary(p, t("Ask for price"), locale).label}</p></Link> : <p className="mb-4 text-slate-500">{name}</p>}<FavoriteButton productId={id} locale={locale} name={name}/></li>;
        })}</ul></>;
}
