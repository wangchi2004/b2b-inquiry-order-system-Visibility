"use client";

import { shopText } from "@/i18n/shopText";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CART_UPDATED_EVENT, getCartItemCount, readCart } from "@/lib/cart";
import { ShopIcon, type ShopIconName } from "./ShopIcon";

const tabs: { label: string; path: string; icon: ShopIconName }[] = [
  { label: "Home", path: "", icon: "home" },
  { label: "Search", path: "/search", icon: "search" },
  { label: "Cart", path: "/cart", icon: "cart" },
  { label: "Orders", path: "/orders", icon: "orders" },
  { label: "Account", path: "/account", icon: "account" },
];
export function ShopNavigation({ locale }: { locale: string }) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  useEffect(() => {
    function refresh() {
      try { setCount(getCartItemCount(readCart())); } catch { setCount(0); }
    }
    refresh();
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return <nav aria-label="Shop navigation" className="shop-bottom-nav">
    <div className="mx-auto grid max-w-xl grid-cols-5">
      {tabs.map(tab => {
        const href = `/${locale}${tab.path}`;
        const active = pathname === href || (tab.path === "" && pathname === "/") || (tab.path === "/orders" && pathname.startsWith(`/${locale}/orders/`)) || (tab.path === "/search" && pathname.startsWith(`/${locale}/products/`));
        return <Link key={shopText(locale, tab.label)} href={href} aria-current={active ? "page" : undefined} className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-medium ${active ? "text-blue-700" : "text-slate-500 hover:text-slate-950"}`}>
          <span className="relative"><ShopIcon name={tab.icon} />{tab.icon === "cart" && count > 0 ? <span aria-label={`${count} items`} className="absolute -right-3 -top-2 min-w-5 rounded-full bg-blue-700 px-1 text-center text-xs leading-5 text-white">{count > 99 ? "99+" : count}</span> : null}</span>
          {shopText(locale, tab.label)}
        </Link>;
      })}
    </div>
  </nav>;
}
