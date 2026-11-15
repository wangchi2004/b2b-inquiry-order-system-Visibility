import type { ReactNode } from 'react';
import { requireAccount } from '@/lib/accountSession';
export async function GeneralOrderGate({ children, redirectTo = '/en/order/general' }: { children: ReactNode; redirectTo?: string }) {
  const locale = redirectTo.match(/^\/(en|zh|ja|ko)\//)?.[1] ?? 'en';
  await requireAccount(locale, redirectTo);
  return <>{children}</>;
}
