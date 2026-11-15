import { CartPageContent } from '@/components/CartPageContent';
import { ShopHeader } from '@/components/storefront/ShopHeader';
import { requireAccount } from '@/lib/accountSession';
export default async function CartPage() {
  const user = await requireAccount('en', '/cart');
  return <><ShopHeader locale="en" /><CartPageContent accountEmail={user.email!} /></>;
}
