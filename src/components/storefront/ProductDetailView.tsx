"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { addCartItems, readCart, setCartLocale, setContinueShoppingPath } from "@/lib/cart";
import type { ProductDetail } from "@/lib/productDetail";
import { detailCartItem, MAX_DETAIL_QUANTITY, minimumDetailQuantity, variantColor, variantUnavailableReason } from "@/lib/productDetailSelection";
import { recordRecentProduct } from "@/lib/recentProducts";
import { ShopIcon } from "./ShopIcon";

export function ProductDetailView({ product, locale }: { product: ProductDetail; locale: string }) {
  const variants = product.product_variants;
  const [variantId, setVariantId] = useState(() => (variants.find(v => !variantUnavailableReason(v)) ?? variants[0])?.id || "");
  const minimum = minimumDetailQuantity(product);
  const [quantity, setQuantity] = useState(String(minimum));
  const [imageIndex, setImageIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  const zoom = useRef<HTMLDialogElement>(null);
  const favorites = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const variant = variants.find(v => v.id === variantId);
  const color = variant ? variantColor(product, variant) : product.color || "Not specified";
  const colors = [...new Set(variants.map(v => variantColor(product, v)))];
  const colorVariants = variants.filter(v => variantColor(product, v) === color);
  const name = product.translated_name || product.name;
  const images = product.galleryImages;
  const image = images[imageIndex];
  const amount = Number(quantity);
  const validQuantity = /^\d+$/.test(quantity) && Number.isSafeInteger(amount) && amount >= minimum && amount <= MAX_DETAIL_QUANTITY;
  const unavailable = variantUnavailableReason(variant);
  const stock = variant?.stock_status === "in_stock" ? "In stock" : variant?.stock_status === "out_of_stock" ? "Out of stock" : variant?.stock_status === "preorder" ? "Preorder" : "Check availability";
  const currency = product.currency || "USD";
  const price = typeof variant?.price === "number" && Number.isFinite(variant.price) && variant.price >= 0
    ? `${currency} ${variant.price.toFixed(2)}`
    : "Ask for price";
  const inquiry = new URLSearchParams({
    subject: `Product inquiry: ${name}${variant ? ` · ${variant.sku}` : ""}`,
    body: `Hello,\n\nI would like to ask about this product:\n${name}\nSKU: ${variant?.sku || "Not available"}\nSize: ${variant?.size || product.size || "Not specified"}\nColor: ${color}\n${validQuantity ? `Quantity: ${amount}\n` : ""}Product: /${locale}/products/${product.slug}\n\nMy question:\n`,
  });
  useEffect(() => { recordRecentProduct(product.id); }, [product.id]);

  function selectVariant(id: string) {
    setVariantId(id);
    setMessage("");
    setAdded(false);
  }
  function changeColor(value: string) {
    const options = variants.filter(v => variantColor(product, v) === value);
    const next = options.find(v => v.size === variant?.size) ?? options.find(v => !variantUnavailableReason(v)) ?? options[0];
    if (next) selectVariant(next.id);
  }
  function changeImage(direction: number) {
    if (images.length) setImageIndex(current => (current + direction + images.length) % images.length);
  }
  function adjustQuantity(delta: number) {
    setQuantity(String(Math.min(MAX_DETAIL_QUANTITY, Math.max(minimum, (Number.isSafeInteger(amount) ? amount : minimum) + delta))));
    setMessage(""); setAdded(false);
  }
  function addToCart() {
    try {
      const existing = readCart().filter(item => item.variantId === variantId).reduce((sum, item) => sum + item.quantity, 0);
      const item = detailCartItem(product, variantId, amount, existing);
      setCartLocale(locale);
      setContinueShoppingPath(`/${locale}/products/${encodeURIComponent(product.slug)}`);
      addCartItems([item]);
      setMessage(`${amount} ${variant?.unit || "item"}${amount === 1 ? "" : "s"} added to your inquiry cart.`);
      setAdded(true);
    } catch (error) {
      setMessage(error instanceof Error && error.name !== "SecurityError" && error.name !== "QuotaExceededError" ? error.message : "Your cart could not be saved. Please allow browser storage and try again.");
      setAdded(false);
    }
  }
  return <div className="shop-surface mx-auto max-w-6xl px-4 pb-28 pt-4 text-slate-950 sm:px-6 md:pb-10">
    <nav aria-label="Breadcrumb" className="mb-4 flex min-h-11 flex-wrap items-center gap-2 text-sm text-slate-500"><Link href={`/${locale}/search`} className="inline-flex min-h-11 items-center text-blue-700">Products</Link><span aria-hidden="true">/</span>{product.category ? <Link href={`/${locale}/search?${new URLSearchParams({ category: product.category })}`} className="inline-flex min-h-11 items-center">{product.category}</Link> : <span>Product details</span>}</nav>
    <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-10">
      <section aria-label="Product images" className="min-w-0 md:sticky md:top-5">
        <div className="relative overflow-hidden rounded-2xl bg-slate-100" onTouchStart={event => { touchX.current = event.touches[0].clientX; }} onTouchEnd={event => { if (touchX.current !== null) { const difference = event.changedTouches[0].clientX - touchX.current; if (Math.abs(difference) > 45) changeImage(difference < 0 ? 1 : -1); } touchX.current = null; }}>
          <button type="button" disabled={!image} onClick={() => zoom.current?.showModal()} aria-label={`Enlarge image ${imageIndex + 1} of ${name}`} className="relative block aspect-square w-full">
            {image ? <Image src={image} alt={`${name} — image ${imageIndex + 1}`} fill unoptimized loading="eager" sizes="(max-width: 768px) 95vw, 540px" className="object-contain p-3" /> : <span className="flex h-full items-center justify-center text-slate-500">Image not available</span>}
          </button>
          {images.length > 1 ? <><button type="button" aria-label="Previous product image" onClick={() => changeImage(-1)} className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-2xl shadow-sm">‹</button><button type="button" aria-label="Next product image" onClick={() => changeImage(1)} className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-2xl shadow-sm">›</button></> : null}
          {images.length ? <span aria-live="polite" className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-sm font-medium">{imageIndex + 1} / {images.length}</span> : null}
        </div>
        {images.length > 1 ? <div className="mt-3 flex gap-2 overflow-x-auto pb-2">{images.map((url, index) => <button type="button" key={url} aria-label={`Show product image ${index + 1}`} aria-pressed={index === imageIndex} onClick={() => setImageIndex(index)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${index === imageIndex ? "border-blue-700" : "border-slate-100"}`}><Image src={url} alt="" fill unoptimized sizes="64px" className="object-contain" /></button>)}</div> : null}
        <p className="mt-2 text-sm text-slate-500">Tap to enlarge{images.length > 1 ? " · Swipe to browse" : ""}</p>
      </section>
      <section aria-label="Product information" className="min-w-0">
        <p className="text-sm font-medium text-blue-700">{product.category || "Shoe repair materials"}</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{name}</h1>
        <p className="mt-3 break-words text-sm text-slate-500">SKU: <span data-testid="selected-sku">{variant?.sku || "Not available"}</span></p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-3xl font-bold" data-testid="selected-price">{price}<span className="ml-2 text-sm font-normal text-slate-500">{variant?.price != null ? `/ ${variant.unit}` : ""}</span></p><span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${stock === "In stock" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{stock}</span></div>
        <p className="mt-3 text-sm leading-6 text-slate-500">Final price and international shipping will be confirmed with your quote.</p>
        <div className="mt-6 border-t border-slate-100 pt-5"><h2 className="text-lg font-semibold">Description</h2><p className="mt-2 whitespace-pre-line text-base leading-7 text-slate-600">{product.translated_description || product.description || "Please contact us for more details about this product."}</p></div>
        <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 rounded-xl bg-slate-50 p-4 text-sm">
          <div><dt className="text-slate-500">Material</dt><dd className="mt-1 font-medium">{product.material || "Not specified"}</dd></div>
          <div><dt className="text-slate-500">MOQ</dt><dd className="mt-1 font-medium">{product.moq != null ? `${product.moq} ${variant?.unit || "units"}` : "Confirm with seller"}</dd></div>
          <div><dt className="text-slate-500">Color</dt><dd className="mt-1 font-medium">{color}</dd></div>
          <div><dt className="text-slate-500">Size</dt><dd className="mt-1 font-medium">{variant?.size || product.size || "Not specified"}</dd></div>
        </dl>
        {colors.length > 1 ? <fieldset className="mt-6"><legend className="mb-3 font-semibold">Color</legend><div className="flex flex-wrap gap-2">{colors.map(value => <button type="button" key={value} aria-pressed={color === value} onClick={() => changeColor(value)} className={`min-h-11 min-w-11 rounded-lg border px-4 text-sm ${color === value ? "border-blue-700 bg-blue-50 font-semibold text-blue-700" : "border-slate-200"}`}>{value}</button>)}</div></fieldset> : null}
        {variants.length ? <fieldset className="mt-6"><legend className="mb-3 font-semibold">Select size / specification</legend><div className="flex flex-wrap gap-2">{colorVariants.map(v => <button type="button" key={v.id} aria-label={`Select ${v.size || v.sku}`} aria-pressed={v.id === variantId} title={`${v.sku} · ${v.stock_status}`} onClick={() => selectVariant(v.id)} className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm ${v.id === variantId ? "border-blue-700 bg-blue-50 font-semibold text-blue-700" : "border-slate-200"} ${v.stock_status === "out_of_stock" ? "text-slate-400 line-through" : ""}`}>{v.size || v.sku}</button>)}</div></fieldset> : null}
        {variant?.dimension_image_url ? <a href={variant.dimension_image_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-blue-700">View measurements for this specification ↗</a> : null}
        <div className="mt-6"><label htmlFor="product-quantity" className="block font-semibold">Quantity</label><div className="mt-3 inline-grid grid-cols-[48px_72px_48px] overflow-hidden rounded-lg border border-slate-300"><button type="button" aria-label="Decrease quantity" disabled={validQuantity && amount <= minimum} onClick={() => adjustQuantity(-1)} className="h-12 bg-slate-50 text-xl disabled:text-slate-300">−</button><input id="product-quantity" type="text" inputMode="numeric" pattern="[0-9]*" value={quantity} aria-invalid={!validQuantity} aria-describedby="quantity-help" onChange={event => { setQuantity(event.target.value); setAdded(false); setMessage(""); }} className="h-12 min-w-0 border-x border-slate-300 text-center text-base outline-blue-700" /><button type="button" aria-label="Increase quantity" disabled={amount >= MAX_DETAIL_QUANTITY} onClick={() => adjustQuantity(1)} className="h-12 bg-slate-50 text-xl disabled:text-slate-300">+</button></div><p id="quantity-help" className="mt-2 text-sm text-slate-500">{validQuantity ? `Quantity in ${variant?.unit || "units"}.` : `Enter a whole quantity from ${minimum} to ${MAX_DETAIL_QUANTITY}.`}</p></div>
        {unavailable ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">{unavailable}</p> : null}
        <div className="product-purchase-bar"><div className="mx-auto flex max-w-6xl items-center gap-4 md:block"><div className="min-w-0 flex-1 md:hidden"><p className="text-sm text-slate-500">{variant?.size ? `Size ${variant.size}` : "Selected specification"}</p><p className="font-semibold">{price}</p></div><button type="button" onClick={addToCart} disabled={Boolean(unavailable) || !validQuantity} className="min-h-12 flex-1 rounded-lg bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 md:mt-6 md:w-full">{added ? "Add More to Cart" : "Add to Cart"}</button></div></div>
        <p role="status" aria-live="polite" className={`mt-3 text-sm leading-6 ${added ? "text-emerald-700" : "text-amber-800"}`}>{message}{added ? <Link href={`/${locale}/cart`} className="ml-2 inline-flex min-h-11 items-center font-semibold text-blue-700 underline">View cart →</Link> : null}</p>
        <div className="mt-3 grid gap-3"><button type="button" onClick={() => favorites.current?.showModal()} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 font-medium"><ShopIcon name="heart" /> Add to Favorites</button><a href={`mailto:wangchi.2004@gmail.com?${inquiry}`} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-center font-medium">Ask About This Product <ShopIcon name="arrow" width="18" /></a></div>
      </section>
    </div>
    <dialog ref={zoom} className="shop-dialog max-w-5xl" aria-label="Enlarged product image" onKeyDown={event => { if (event.key === "ArrowRight") changeImage(1); if (event.key === "ArrowLeft") changeImage(-1); }}><button type="button" aria-label="Close image" onClick={() => zoom.current?.close()} className="mb-3 ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100"><ShopIcon name="close" /></button>{image ? <div className="relative h-[65dvh]"><Image src={image} alt={`${name} — enlarged image ${imageIndex + 1}`} fill unoptimized sizes="90vw" className="object-contain" /></div> : null}{images.length > 1 ? <div className="mt-3 flex items-center justify-between"><button type="button" onClick={() => changeImage(-1)} className="min-h-11 px-4">← Previous</button><span>{imageIndex + 1} / {images.length}</span><button type="button" onClick={() => changeImage(1)} className="min-h-11 px-4">Next →</button></div> : null}</dialog>
    <dialog ref={favorites} className="shop-dialog max-w-md" aria-labelledby="detail-favorites-title"><button type="button" aria-label="Close favorites" onClick={() => favorites.current?.close()} className="mb-3 ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100"><ShopIcon name="close" /></button><h2 id="detail-favorites-title" className="text-xl font-semibold">Favorites are coming soon</h2><p className="mt-3 leading-7 text-slate-600">You can add this product to your inquiry cart today. Saved favorites will be available with customer accounts.</p></dialog>
  </div>;
}
