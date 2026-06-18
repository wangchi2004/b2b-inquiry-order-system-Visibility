"use client";

import { useMemo, useState } from "react";
import { addCartItems, setCartLocale, setContinueShoppingPath } from "@/lib/cart";
import { recordSampleAnalytics } from "@/lib/sampleAnalytics";
import type { ProductWithVariants } from "@/lib/types";

type ProductCardProps = {
  product: ProductWithVariants;
  mode?: "order" | "sample";
  labels?: ProductCardLabels;
};

export type ProductCardLabels = {
  addToInquiryList?: string;
  viewDetails?: string;
  product?: string;
  color?: string;
  size?: string;
  material?: string;
  moq?: string;
  sizeRange?: string;
  price?: string;
  pricePending?: string;
  selectQuantityBySize?: string;
  selected?: string;
  noVariants?: string;
  specifications?: string;
  sku?: string;
  unit?: string;
  stockStatus?: string;
  added?: string;
  enterQuantity?: string;
};

export function ProductCard({ product, mode = "order", labels }: ProductCardProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedMessage, setAddedMessage] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const productImages = [product.image_url, product.image_url_2, product.image_url_3].filter(
    (imageUrl): imageUrl is string => Boolean(imageUrl)
  );
  const primaryImageUrl = productImages[0];
  const activeImage = productImages[activeImageIndex] ?? productImages[0];
  const unitLabel = product.product_variants[0]?.unit ?? "unit";
  const sizeRange = getSizeRange(product);
  const productName = product.translated_name ?? product.name;
  const productDescription = product.translated_description ?? product.description;
  const productCategory = product.translated_category ?? product.category;
  const isSampleMode = mode === "sample";
  const priceSummary = getPriceSummary(
    product,
    labels?.pricePending ?? "Price pending, contact sales"
  );

  const selectedItems = useMemo(() => {
    return product.product_variants
      .map((variant) => ({
        productId: product.id,
        variantId: variant.id,
        productName,
        imageUrl: primaryImageUrl,
        sku: variant.sku,
        color: variant.color ?? product.color ?? undefined,
        size: variant.size ?? undefined,
        unit: variant.unit,
        unitPrice: variant.price,
        quantity: quantities[variant.id] ?? 0
      }))
      .filter((item) => item.quantity > 0);
  }, [product, productName, quantities, primaryImageUrl]);

  const selectedQuantity = selectedItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  function updateQuantity(variantId: string, value: string) {
    const quantity = Math.max(0, Number.parseInt(value, 10) || 0);
    setQuantities((current) => ({
      ...current,
      [variantId]: quantity
    }));
    setAddedMessage("");
  }

  function adjustQuantity(variantId: string, delta: number) {
    setQuantities((current) => ({
      ...current,
      [variantId]: Math.max(0, (current[variantId] ?? 0) + delta)
    }));
    setAddedMessage("");
  }

  function addToCart() {
    if (selectedItems.length === 0) {
      setAddedMessage(labels?.enterQuantity ?? "Enter at least one quantity.");
      return;
    }

    addCartItems(selectedItems);
    setContinueShoppingPath(`${window.location.pathname}${window.location.search}`);
    setCartLocale(getLocaleFromPath(window.location.pathname));
    setAddedMessage(labels?.added ?? "Added to inquiry cart.");
  }

  function showPreviousImage() {
    setActiveImageIndex((current) =>
      current === 0 ? productImages.length - 1 : current - 1
    );
  }

  function showNextImage() {
    setActiveImageIndex((current) =>
      current === productImages.length - 1 ? 0 : current + 1
    );
  }

  function openPreview(trackViewDetails = false) {
    if (trackViewDetails && isSampleMode) {
      recordSampleAnalytics({
        eventName: "view_details",
        productId: product.id,
        productName
      });
    }

    setIsPreviewOpen(true);
  }

  return (
    <article className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={
          isSampleMode
            ? "grid gap-4"
            : "grid gap-6 xl:grid-cols-[230px_280px_minmax(0,1fr)] xl:items-center 2xl:grid-cols-[260px_320px_minmax(0,1fr)]"
        }
      >
        <div
          className={
            isSampleMode
              ? "flex min-w-0 flex-col"
              : "min-w-0"
          }
        >
          {activeImage ? (
            <div
              className={
                isSampleMode
                  ? "relative mx-auto min-h-[520px] w-full flex-1"
                  : "relative mx-auto max-w-[220px]"
              }
            >
              <button
                type="button"
                onClick={() => openPreview()}
                className={isSampleMode ? "block h-full w-full" : "block w-full"}
                aria-label={`Open large image for ${productName}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeImage}
                  alt={productName}
                  className={
                    isSampleMode
                      ? "h-full min-h-[520px] w-full rounded bg-slate-100 object-contain"
                      : "aspect-[4/3] w-full rounded bg-slate-100 object-contain"
                  }
                />
              </button>
              {productImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={showPreviousImage}
                    className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-semibold text-slate-950 shadow"
                    aria-label="Previous product image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={showNextImage}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-semibold text-slate-950 shadow"
                    aria-label="Next product image"
                  >
                    ›
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <div
              className={
                isSampleMode
                  ? "mx-auto flex min-h-[520px] w-full flex-1 items-center justify-center rounded bg-slate-100 text-sm text-slate-400"
                  : "mx-auto flex aspect-[4/3] max-w-[220px] items-center justify-center rounded bg-slate-100 text-sm text-slate-400"
              }
            >
              No image
            </div>
          )}

          {!isSampleMode ? (
            <button
              type="button"
              onClick={() => openPreview(true)}
              disabled={!activeImage}
              className="mt-4 h-10 w-full rounded border border-slate-300 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {labels?.viewDetails ?? "View Details"}
            </button>
          ) : null}
        </div>

        {!isSampleMode ? (
          <div className="min-w-0">
            <p className="text-sm text-slate-500">
              {productCategory ?? labels?.product ?? "Product"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              {productName}
            </h2>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-700">
              <span>{labels?.color ?? "Color"}: {product.color ?? "Custom"}</span>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span>{labels?.moq ?? "MOQ"}: 1 {unitLabel}</span>
              {sizeRange ? (
                <>
                  <span className="hidden text-slate-300 sm:inline">|</span>
                  <span>{labels?.sizeRange ?? "Size Range"}: {sizeRange}</span>
                </>
              ) : null}
            </div>
            <div className="mt-3 inline-flex rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span className="font-semibold text-slate-700">
                {labels?.price ?? "Price"}:&nbsp;
              </span>
              <span
                className={
                  priceSummary.hasPrice
                    ? "font-semibold text-slate-950"
                    : "font-semibold text-amber-700"
                }
              >
                {priceSummary.label}
              </span>
            </div>
            {product.material ? (
              <p className="mt-3 text-sm text-slate-600">
                {labels?.material ?? "Material"}: {product.material}
              </p>
            ) : null}
            {productDescription ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                {productDescription}
              </p>
            ) : null}
          </div>
        ) : null}

        {!isSampleMode ? (
          <div className="min-w-0 xl:self-stretch">
            <h3 className="text-sm font-semibold text-slate-950">
              {labels?.selectQuantityBySize?.replace("{unit}", unitLabel) ??
                `Select Quantity (${unitLabel}) by Size`}
            </h3>
            {product.product_variants.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2.5">
                {product.product_variants.map((variant) => {
                  const variantLabel = variant.size ?? variant.sku ?? "Option";

                  return (
                    <div
                      key={variant.id}
                      className="w-24 overflow-hidden rounded border border-slate-200"
                    >
                      <div
                        title={variantLabel}
                        className="h-9 truncate border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-sm font-semibold leading-6 text-slate-950"
                      >
                        {variantLabel}
                      </div>
                      <div className="grid h-7 grid-cols-[26px_1fr_26px]">
                        <button
                          type="button"
                          onClick={() => adjustQuantity(variant.id, -1)}
                          className="flex h-full items-center justify-center border-r border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                          aria-label={`Decrease ${variantLabel}`}
                        >
                          -
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={quantities[variant.id] ?? 0}
                          onChange={(event) => updateQuantity(variant.id, event.target.value)}
                          className="flex h-full w-full items-center justify-center border-0 p-0 text-center text-sm leading-8 outline-none"
                          aria-label={`Quantity for ${variantLabel}`}
                        />
                        <button
                          type="button"
                          onClick={() => adjustQuantity(variant.id, 1)}
                          className="flex h-full items-center justify-center border-l border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                          aria-label={`Increase ${variantLabel}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                {labels?.noVariants ?? "No variants available for this product."}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between xl:mt-8">
              <p className="text-sm text-slate-600">
                {labels?.selected?.replace("{quantity}", String(selectedQuantity)) ??
                  `Selected: ${selectedQuantity}`}
              </p>
              <button
                type="button"
                onClick={addToCart}
                disabled={product.product_variants.length === 0}
                className="h-11 rounded bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {labels?.addToInquiryList ?? "Add to Inquiry Cart"}
              </button>
            </div>
            {addedMessage ? (
              <p className="mt-2 text-sm text-slate-600">{addedMessage}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {isPreviewOpen && activeImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="relative w-full max-w-5xl">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute right-0 top-0 z-10 h-10 rounded bg-white px-4 text-sm font-semibold text-slate-950"
            >
              Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage}
              alt={`${productName} large preview`}
              className="max-h-[82vh] w-full rounded bg-white object-contain"
            />
            {productImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={showPreviousImage}
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-semibold text-slate-950 shadow"
                  aria-label="Previous large product image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-semibold text-slate-950 shadow"
                  aria-label="Next large product image"
                >
                  ›
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function getLocaleFromPath(pathname: string) {
  const locale = pathname.split("/").filter(Boolean)[0];

  return ["en", "ko", "ja", "zh"].includes(locale) ? locale : undefined;
}

function getSizeRange(product: ProductWithVariants) {
  const sizes = product.product_variants
    .map((variant) => variant.size)
    .filter((size): size is string => Boolean(size));

  if (sizes.length === 0) {
    return "";
  }

  const numericSizes = sizes.map((size) => Number(size));

  if (numericSizes.every(Number.isFinite)) {
    return `${Math.min(...numericSizes)} - ${Math.max(...numericSizes)}`;
  }

  return sizes.join(", ");
}

function getPriceSummary(product: ProductWithVariants, pendingLabel: string) {
  const prices = product.product_variants
    .map((variant) => variant.price)
    .filter(isPriced);
  const hasPendingPrice = product.product_variants.some(
    (variant) => !isPriced(variant.price)
  );

  if (prices.length === 0) {
    return {
      hasPrice: false,
      label: pendingLabel
    };
  }

  const uniquePrices = Array.from(new Set(prices));
  const priceLabel = uniquePrices.length === 1
    ? formatMoney(uniquePrices[0])
    : `From ${formatMoney(Math.min(...prices))}`;

  return {
    hasPrice: true,
    label: hasPendingPrice
      ? `${priceLabel}; ${pendingLabel}`
      : priceLabel
  };
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function isPriced(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
