import { requireAccount } from '@/lib/accountSession';
import { getStorefrontData } from '@/lib/storefront';
import { ShopHeader } from '@/components/storefront/ShopHeader';
import { FavoritesList } from '@/components/FavoritesList';
export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAccount(locale);
  const catalog = await getStorefrontData(locale);
  return <main className="min-h-screen bg-white"><ShopHeader locale={locale} /><section className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><h1 className="mb-3 text-3xl font-bold">My Favorites / 我的收藏</h1><p className="mb-7 text-slate-600">Saved to your account, available across devices. / 收藏保存在账号中，可跨设备查看。</p><FavoritesList products={catalog.products} locale={locale} catalogError={catalog.error} /></section></main>;
}
