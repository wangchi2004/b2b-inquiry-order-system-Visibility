"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CART_UPDATED_EVENT, getCartItemCount, readCart } from "@/lib/cart";

type HeaderProps = {
  homeHref?: string;
  catalogHref?: string;
  cartHref?: string;
  labels?: {
    siteName?: string;
    catalog?: string;
    cart?: string;
  };
};

export function Header({
  homeHref = "/",
  catalogHref = "/catalog",
  cartHref = "/cart",
  labels
}: HeaderProps) {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    function refreshCartCount() {
      setCartCount(getCartItemCount(readCart()));
    }

    refreshCartCount();
    window.addEventListener(CART_UPDATED_EVENT, refreshCartCount);
    window.addEventListener("storage", refreshCartCount);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, refreshCartCount);
      window.removeEventListener("storage", refreshCartCount);
    };
  }, []);

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href={homeHref}
          className="min-w-0 truncate text-base font-semibold text-slate-950 sm:text-lg"
        >
          {labels?.siteName ?? "B2B Inquiry Order System"}
        </Link>
        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <Link
            href={catalogHref}
            className="text-sm font-medium text-slate-700 transition hover:text-blue-700"
          >
            {labels?.catalog ?? "Catalog"}
          </Link>
          <Link
            href={cartHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"
          >
            <span className="hidden sm:inline">{labels?.cart ?? "Cart"}</span>
            <span className="min-w-6 rounded-full bg-slate-950 px-2 py-0.5 text-center text-xs font-semibold text-white">
              {cartCount}
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
