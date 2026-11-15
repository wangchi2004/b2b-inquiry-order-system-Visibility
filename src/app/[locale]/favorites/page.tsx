import { shopText } from "@/i18n/shopText";
import { requireAccount } from '@/lib/accountSession';
import { getStorefrontData } from '@/lib/storefront';
import { ShopHeader } from '@/components/storefront/ShopHeader';
import { FavoritesList } from '@/components/FavoritesList';
export default async function FavoritesPage({ params }: {
    params: Promise<{
        locale: string;
    }>;
}) {
    const { locale } = await params;
    const t = (text: string) => shopText(locale, text);
    await requireAccount(locale);
    const catalog = await getStorefrontData(locale);
    return <main className="min-h-screen bg-white"><ShopHeader locale={locale}/><section className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><h1 className="mb-3 text-3xl font-bold">{t("My Favorites / \u6211\u7684\u6536\u85CF")}</h1><p className="mb-7 text-slate-600">{t("Saved to your account, available across devices. / \u6536\u85CF\u4FDD\u5B58\u5728\u8D26\u53F7\u4E2D\uFF0C\u53EF\u8DE8\u8BBE\u5907\u67E5\u770B\u3002")}</p><FavoritesList products={catalog.products} locale={locale} catalogError={catalog.error}/></section></main>;
}
