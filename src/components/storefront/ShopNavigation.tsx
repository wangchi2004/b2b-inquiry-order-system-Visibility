"use client";

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
        const active = pathname === href || (tab.path === "" && pathname === "/") || (tab.path === "/search" && pathname.startsWith(`/${locale}/products/`));
        return <Link key={tab.label} href={href} aria-current={active ? "page" : undefined} className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-medium ${active ? "text-blue-700" : "text-slate-500 hover:text-slate-950"}`}>
          <span className="relative"><ShopIcon name={tab.icon} />{tab.icon === "cart" && count > 0 ? <span aria-label={`${count} items`} className="absolute -right-3 -top-2 min-w-5 rounded-full bg-blue-700 px-1 text-center text-xs leading-5 text-white">{count > 99 ? "99+" : count}</span> : null}</span>
          {tab.label}
        </Link>;
      })}
    </div>
  </nav>;
}
export function ShopHeader({ locale }: { locale: string }) {
  return <header className="border-b border-slate-100 bg-white">
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href={`/${locale}`} aria-label="Shoe repair materials home" className="flex min-h-11 items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white"><ShopIcon name="box" /></span>
        <span><span className="block text-lg font-bold tracking-tight text-slate-950">Shoe Repair Materials</span><span className="block text-xs text-slate-500">PARTS · MATERIALS · TOOLS</span></span>
      </Link>
      <Link href={`/${locale}/catalog`} className="flex min-h-11 items-center text-sm font-medium text-slate-600">Catalog</Link>
    </div>
  </header>;
}
