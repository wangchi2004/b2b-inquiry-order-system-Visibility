import { checkoutAddress } from "@/lib/customerAddresses";
import { CartPageContent } from '@/components/CartPageContent';
import { ShopHeader } from '@/components/storefront/ShopHeader';
import { requireAccount } from '@/lib/accountSession';
export default async function CartPage() {
  const user = await requireAccount('en', '/cart');
  const shippingAddress = await checkoutAddress(user.id);
  return <><ShopHeader locale="en" /><CartPageContent accountEmail={user.email!} shippingAddress={shippingAddress} /></>;
}
