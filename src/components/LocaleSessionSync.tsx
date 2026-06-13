"use client";

import { useEffect } from "react";
import { setCartLocale } from "@/lib/cart";

type LocaleSessionSyncProps = {
  locale: string;
};

export function LocaleSessionSync({ locale }: LocaleSessionSyncProps) {
  useEffect(() => {
    setCartLocale(locale);
  }, [locale]);

  return null;
}
