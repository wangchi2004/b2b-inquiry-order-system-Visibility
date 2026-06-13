"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCartLocale } from "@/lib/cart";

export function LegacyOrderLocaleRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const locale = getCartLocale();

    if (!locale || !pathname.startsWith("/order/")) {
      return;
    }

    const queryString = window.location.search;
    router.replace(`/${locale}${pathname}${queryString}`);
  }, [pathname, router]);

  return null;
}
