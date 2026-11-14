import { ResetPassword } from '@/components/ResetPassword';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Reset password', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ResetPassword locale={locale} />;
}
