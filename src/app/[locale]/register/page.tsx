import { redirect } from 'next/navigation';
import { accountUser } from '@/lib/accountSession';
import { AccountRegister } from '@/components/AccountRegister';
import { ShopHeader } from '@/components/storefront/ShopHeader';
export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (await accountUser()) redirect(`/${locale}/account`);
  return <main className="min-h-screen bg-white"><ShopHeader locale={locale} /><AccountRegister locale={locale} /></main>;
}
