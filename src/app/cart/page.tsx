"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import {
  clearCart,
  getCartLocale,
  getCartItemKey,
  getCartItemCount,
  getContinueShoppingPath,
  readOrderLinkSession,
  readVisitorOrderSession,
  readCart,
  removeCartItem,
  setCartLocale,
  updateCartItemQuantity,
  writeCart
} from "@/lib/cart";
import { createSupabaseBrowserClient, hasSupabasePublicConfig } from "@/lib/supabase";
import { validateOrderSubmission } from "@/lib/orderValidation";
import type { CartLineItem } from "@/lib/types";

type CustomerFormState = {
  email: string;
  country: string;
  whatsapp: string;
  name: string;
  company: string;
  note: string;
};

type InquiryImageDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

export type CartPageLabels = {
  siteName?: string;
  home?: string;
  cart?: string;
  title?: string;
  continueShopping?: string;
  notice?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  productImage?: string;
  productInformation?: string;
  quantityTotal?: string;
  noImage?: string;
  color?: string;
  custom?: string;
  size?: string;
  sizeRange?: string;
  moq?: string;
  totalQuantity?: string;
  unitPrice?: string;
  total?: string;
  totalItems?: string;
  estimatedTotal?: string;
  waitingPrice?: string;
  availability?: string;
  yourInformation?: string;
  name?: string;
  namePlaceholder?: string;
  email?: string;
  emailPlaceholder?: string;
  country?: string;
  countryPlaceholder?: string;
  company?: string;
  companyPlaceholder?: string;
  note?: string;
  notePlaceholder?: string;
  inquiryImages?: string;
  inquiryImagesHelp?: string;
  whatsapp?: string;
  whatsappPlaceholder?: string;
  submitInquiry?: string;
  submitLoading?: string;
  remove?: string;
};

const maxInquiryImages = 3;
const maxInquiryImageSize = 8 * 1024 * 1024;

const initialCustomerForm: CustomerFormState = {
  email: "",
  country: "",
  whatsapp: "",
  name: "",
  company: "",
  note: ""
};

export default function CartPage() {
  return <CartPageContent />;
}

export function CartPageContent({
  labels,
  locale
}: {
  labels?: CartPageLabels;
  locale?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<CartLineItem[]>([]);
  const defaultContinueShoppingPath = locale ? `/${locale}/order/general` : "/order/sample-buyer-token";
  const [continueShoppingPath, setContinueShoppingPath] = useState(defaultContinueShoppingPath);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(initialCustomerForm);
  const [orderToken, setOrderToken] = useState<string | null>(null);
  const [orderLinkMessage, setOrderLinkMessage] = useState("");
  const [inquiryImages, setInquiryImages] = useState<InquiryImageDraft[]>([]);
  const [inquiryImageError, setInquiryImageError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (locale) {
        setCartLocale(locale);
      } else {
        const savedLocale = getCartLocale();

        if (savedLocale) {
          router.replace(`/${savedLocale}/cart`);
          return;
        }
      }

      const savedItems = readCart();
      setItems(savedItems);
      hydrateCartImages(savedItems).then((itemsWithImages) => {
        if (itemsWithImages) {
          writeCart(itemsWithImages);
          setItems(itemsWithImages);
        }
      });
      const savedContinueShoppingPath = getContinueShoppingPath();
      const localizedContinueShoppingPath =
        locale && savedContinueShoppingPath.startsWith("/order/")
          ? `/${locale}${savedContinueShoppingPath}`
          : savedContinueShoppingPath;
      setContinueShoppingPath(
        localizedContinueShoppingPath === "/order/sample-buyer-token"
          ? defaultContinueShoppingPath
          : localizedContinueShoppingPath
      );
      const session = readOrderLinkSession();

      if (session) {
        setOrderToken(session.token);
        setOrderLinkMessage(
          session.message ??
            `Customer information loaded from private order link.`
        );
        setCustomerForm((currentForm) => ({
          ...currentForm,
          email: session.customer.email ?? currentForm.email,
          country: session.customer.country ?? currentForm.country,
          whatsapp: session.customer.whatsapp ?? currentForm.whatsapp,
          name: session.customer.name ?? currentForm.name,
          company: session.customer.company ?? currentForm.company
        }));
      } else {
        const visitorSession = readVisitorOrderSession();

        if (visitorSession) {
          setCustomerForm((currentForm) => ({
            ...currentForm,
            email: visitorSession.email,
            country: visitorSession.country
          }));
        }
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [defaultContinueShoppingPath, locale, router]);

  const totalQuantity = useMemo(() => getCartItemCount(items), [items]);
  const productGroups = useMemo(() => groupCartItemsByProduct(items), [items]);
  const estimatedTotal = useMemo(() => calculateEstimatedTotal(productGroups), [productGroups]);

  function refreshCart() {
    setItems(readCart());
  }

  function handleRemove(itemKey: string) {
    removeCartItem(itemKey);
    refreshCart();
    setSubmitError("");
  }

  function handleQuantityChange(itemKey: string, quantity: number) {
    updateCartItemQuantity(itemKey, quantity);
    refreshCart();
    setSubmitError("");
  }

  function handleRemoveGroup(group: CartProductGroup) {
    const keysToRemove = new Set(group.items.map((item) => getCartItemKey(item)));
    writeCart(readCart().filter((item) => !keysToRemove.has(getCartItemKey(item))));
    refreshCart();
    setSubmitError("");
  }

  function handleCustomerChange(
    field: keyof CustomerFormState,
    value: string
  ) {
    setCustomerForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
    setSubmitError("");
  }

  function handleInquiryImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    const acceptedImages: InquiryImageDraft[] = [];
    let errorMessage = "";

    for (const file of selectedFiles) {
      if (inquiryImages.length + acceptedImages.length >= maxInquiryImages) {
        errorMessage = "You can upload up to 3 inquiry images.";
        break;
      }

      if (!file.type.startsWith("image/")) {
        errorMessage = "Only image files can be uploaded.";
        continue;
      }

      if (file.size > maxInquiryImageSize) {
        errorMessage = "Each inquiry image must be 8 MB or smaller.";
        continue;
      }

      acceptedImages.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file)
      });
    }

    if (acceptedImages.length > 0) {
      setInquiryImages((currentImages) => [...currentImages, ...acceptedImages]);
    }

    setInquiryImageError(errorMessage);
    setSubmitError("");
  }

  function handleRemoveInquiryImage(imageId: string) {
    setInquiryImages((currentImages) => {
      const image = currentImages.find((item) => item.id === imageId);

      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      return currentImages.filter((item) => item.id !== imageId);
    });
    setInquiryImageError("");
    setSubmitError("");
  }

  async function uploadInquiryImages() {
    const uploadedImageUrls: string[] = [];

    for (const [index, image] of inquiryImages.entries()) {
      const formData = new FormData();
      formData.append("file", image.file);
      formData.append("email", customerForm.email);
      formData.append("slot", String(index + 1));

      const response = await fetch("/api/inquiry-images", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        throw new Error(responseBody?.message ?? "Failed to upload inquiry image.");
      }

      const responseBody = (await response.json()) as {
        imageUrl?: string | null;
      };

      if (responseBody.imageUrl) {
        uploadedImageUrls.push(responseBody.imageUrl);
      }
    }

    return uploadedImageUrls;
  }

  async function handleSubmitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      customer: customerForm,
      items,
      token: orderToken ?? undefined,
      locale: locale ?? "en"
    };

    const validation = validateOrderSubmission(payload);

    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const inquiryImageUrls = await uploadInquiryImages();
      const validatedPayload = {
        ...validation.data,
        customer: {
          ...validation.data.customer,
          inquiryImageUrls
        }
      };
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(validatedPayload)
      });

      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(responseBody?.message ?? "Failed to submit order.");
      }

      clearCart();
      setItems([]);
      inquiryImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setInquiryImages([]);
      router.push("/success");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Header
        homeHref={locale ? `/${locale}` : "/"}
        cartHref={locale ? `/${locale}/cart` : "/cart"}
        labels={{
          siteName: labels?.siteName,
          cart: labels?.cart
        }}
      />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Link href={continueShoppingPath} className="hover:text-blue-700">
            {labels?.home ?? "Home"}
          </Link>
          <span>›</span>
          <span className="text-blue-700">{labels?.title ?? "Inquiry Cart"}</span>
        </div>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-4xl font-semibold text-slate-950">
            {labels?.title ?? "Inquiry Cart"}
          </h1>
          <Link
            href={continueShoppingPath}
            className="inline-flex h-11 items-center justify-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-800"
          >
            {labels?.continueShopping ?? "Continue Shopping"}
          </Link>
        </div>
        <div className="mt-6 rounded border border-blue-200 bg-blue-50 px-5 py-4 text-base font-medium text-blue-700">
          {labels?.notice ??
            "This is not a payment. Submit your inquiry and we will contact you with a quotation."}
        </div>

        {items.length === 0 ? (
          <div className="mt-6 rounded border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-950">
              {labels?.emptyTitle ?? "Your cart is empty"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {labels?.emptyDescription ??
                "Add product specifications and quantities from the private order page."}
            </p>
            <Link
              href={continueShoppingPath}
              className="mt-5 inline-flex h-11 items-center justify-center rounded bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              {labels?.continueShopping ?? "Continue Shopping"}
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            <section className="overflow-hidden rounded border border-slate-200 bg-white">
              <div className="hidden grid-cols-[220px_1fr_320px] border-b border-slate-200 bg-slate-50 px-6 py-4 text-base font-semibold text-slate-950 lg:grid">
                <div>{labels?.productImage ?? "Product Image"}</div>
                <div>{labels?.productInformation ?? "Product Information"}</div>
                <div>{labels?.quantityTotal ?? "Quantity & Total"}</div>
              </div>
              <div className="divide-y divide-slate-200">
              {productGroups.map((group) => (
                <CartProductGroup
                  key={group.productId}
                  group={group}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemove}
                  onRemoveGroup={() => handleRemoveGroup(group)}
                  labels={labels}
                />
              ))}
              </div>
              <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-right">
                <div className="flex flex-col gap-3 text-base text-slate-600 sm:flex-row sm:items-center sm:justify-end sm:gap-8">
                  <p>
                    {labels?.totalItems ?? "Total Items"}:{" "}
                    <strong className="text-slate-950">{totalQuantity}</strong>
                  </p>
                  <p>
                    {labels?.estimatedTotal ?? "Estimated Total"}:{" "}
                    <strong className="text-slate-950">
                      {estimatedTotal === null
                        ? labels?.waitingPrice ?? "Waiting for seller to fill in"
                        : formatMoney(estimatedTotal)}
                    </strong>
                  </p>
                </div>
                <p className="mt-5 text-sm text-slate-600">
                  {labels?.availability ??
                    "We will confirm product availability as soon as possible. Shipping costs will be included in our reply email."}
                </p>
              </div>
            </section>

            <form
              onSubmit={handleSubmitOrder}
              className="space-y-5"
            >
              <h2 className="text-2xl font-semibold text-slate-950">
                {labels?.yourInformation ?? "Your Information"}
              </h2>
              {orderLinkMessage ? (
                <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {orderLinkMessage}
                </p>
              ) : null}
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  {labels?.name ?? "Name"}
                  <input
                    name="name"
                    autoComplete="name"
                    value={customerForm.name}
                    placeholder={labels?.namePlaceholder ?? "Your Name"}
                    onChange={(event) => handleCustomerChange("name", event.target.value)}
                    className="mt-2 h-12 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {labels?.email ?? "Email"} <span className="text-red-600">*</span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={customerForm.email}
                    placeholder={labels?.emailPlaceholder ?? "Your Email"}
                    onChange={(event) => handleCustomerChange("email", event.target.value)}
                    className="mt-2 h-12 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {labels?.country ?? "Country"} <span className="text-red-600">*</span>
                  <input
                    name="country"
                    required
                    autoComplete="country-name"
                    value={customerForm.country}
                    placeholder={labels?.countryPlaceholder ?? "Your Country"}
                    onChange={(event) => handleCustomerChange("country", event.target.value)}
                    className="mt-2 h-12 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {labels?.company ?? "Company"}
                  <input
                    name="company"
                    autoComplete="organization"
                    value={customerForm.company}
                    placeholder={labels?.companyPlaceholder ?? "Your Company"}
                    onChange={(event) => handleCustomerChange("company", event.target.value)}
                    className="mt-2 h-12 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                  {labels?.note ?? "Note"}
                  <textarea
                    name="note"
                    rows={4}
                    value={customerForm.note}
                    placeholder={
                      labels?.notePlaceholder ?? "Tell us anything about your inquiry..."
                    }
                    onChange={(event) => handleCustomerChange("note", event.target.value)}
                    className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </label>
                <div className="rounded border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {labels?.inquiryImages ?? "Inquiry Images"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {labels?.inquiryImagesHelp ??
                          "Optional. Upload up to 3 images with your note. Max 8 MB each."}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {inquiryImages.length}/{maxInquiryImages}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={inquiryImages.length >= maxInquiryImages || isSubmitting}
                    onChange={handleInquiryImagesChange}
                    className="mt-3 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                  {inquiryImages.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {inquiryImages.map((image, index) => (
                        <div
                          key={image.id}
                          className="rounded border border-slate-200 bg-white p-2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.previewUrl}
                            alt={`Inquiry image ${index + 1}`}
                            className="aspect-[4/3] w-full rounded bg-slate-100 object-contain"
                          />
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="truncate text-xs text-slate-500">
                              {image.file.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleRemoveInquiryImage(image.id)}
                              className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              {labels?.remove ?? "Remove"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {inquiryImageError ? (
                    <p className="mt-3 text-sm text-red-700">{inquiryImageError}</p>
                  ) : null}
                </div>
                <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                  {labels?.whatsapp ?? "WhatsApp"}
                  <input
                    name="whatsapp"
                    autoComplete="tel"
                    value={customerForm.whatsapp}
                    placeholder={labels?.whatsappPlaceholder ?? "Your WhatsApp Number"}
                    onChange={(event) => handleCustomerChange("whatsapp", event.target.value)}
                    className="mt-2 h-12 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="h-12 rounded bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting
                  ? labels?.submitLoading ?? "Submitting Inquiry..."
                  : labels?.submitInquiry ?? "Submit Inquiry"}
              </button>
              {submitError ? (
                <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </p>
              ) : null}
            </form>
          </div>
        )}
      </section>
    </main>
  );
}

type CartProductGroup = {
  productId: string;
  productName: string;
  imageUrl?: string;
  color?: string;
  unit?: string;
  items: CartLineItem[];
  totalQuantity: number;
  unitPrice: number | null;
  total: number | null;
};

function CartProductGroup({
  group,
  onQuantityChange,
  onRemove,
  onRemoveGroup,
  labels
}: {
  group: CartProductGroup;
  onQuantityChange: (itemKey: string, quantity: number) => void;
  onRemove: (itemKey: string) => void;
  onRemoveGroup: () => void;
  labels?: CartPageLabels;
}) {
  return (
    <article className="px-6 py-8">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr_320px] lg:items-center">
        <div className="lg:pr-4">
          {group.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.imageUrl}
              alt={group.productName}
              className="mx-auto aspect-[4/3] max-w-[180px] rounded bg-slate-100 object-contain"
            />
          ) : (
            <div className="mx-auto flex aspect-[4/3] max-w-[180px] items-center justify-center rounded bg-slate-100 text-sm text-slate-400">
              {labels?.noImage ?? "No image"}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="text-xl font-semibold text-slate-950">
            {group.productName}
          </h3>
          <div className="mt-3 space-y-1 text-base text-slate-600">
            <p>
              {labels?.color ?? "Color"}: {group.color ?? labels?.custom ?? "Custom"}
            </p>
            <p>
              {labels?.sizeRange ?? "Size Range"}: {getGroupSizeRange(group.items)}
            </p>
            <p>
              {labels?.moq ?? "MOQ"}: 1 {formatUnit(group.unit, 1)}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {group.items.map((item) => {
              const itemKey = getCartItemKey(item);

              return (
                <div
                  key={itemKey}
                  className="overflow-hidden rounded border border-slate-200 bg-white"
                >
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-sm font-semibold text-slate-950">
                    {item.size ? `${labels?.size ?? "Size"} ${item.size}` : item.sku}
                  </div>
                  <div className="grid h-9 grid-cols-[32px_42px_32px_28px]">
                    <button
                      type="button"
                      onClick={() => onQuantityChange(itemKey, item.quantity - 1)}
                      className="flex h-full items-center justify-center border-r border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                      aria-label={`Decrease ${item.productName} ${item.size ?? item.sku}`}
                    >
                      -
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.quantity}
                      onChange={(event) =>
                        onQuantityChange(itemKey, Number(event.target.value))
                      }
                      className="h-full w-full border-0 p-0 text-center text-sm leading-9 outline-none"
                      aria-label={`${item.productName} ${item.size ?? item.sku} quantity`}
                    />
                    <button
                      type="button"
                      onClick={() => onQuantityChange(itemKey, item.quantity + 1)}
                      className="flex h-full items-center justify-center border-l border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                      aria-label={`Increase ${item.productName} ${item.size ?? item.sku}`}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(itemKey)}
                      className="border-l border-red-200 text-sm font-semibold text-red-700 hover:bg-red-50"
                      aria-label={`Remove ${item.productName} ${item.size ?? item.sku}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-3 text-base">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">
                {labels?.totalQuantity ?? "Total Quantity"}
              </span>
              <strong className="text-slate-950">
                {group.totalQuantity} {formatUnit(group.unit, group.totalQuantity)}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">
                {labels?.unitPrice ?? "Unit Price"}
              </span>
              <strong className="text-slate-950">{formatMoney(group.unitPrice)}</strong>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-lg font-semibold text-slate-950">
                  {labels?.total ?? "Total"}
                </span>
                <strong className="text-xl text-blue-700">{formatMoney(group.total)}</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
          onClick={onRemoveGroup}
          className="mt-4 h-11 w-full rounded border border-red-200 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          {labels?.remove ?? "Remove"}
        </button>
        </div>
      </div>
    </article>
  );
}

function groupCartItemsByProduct(items: CartLineItem[]): CartProductGroup[] {
  const groups = new Map<string, CartProductGroup>();

  for (const item of items) {
    const existingGroup = groups.get(item.productId);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.totalQuantity += item.quantity;
      existingGroup.imageUrl = existingGroup.imageUrl ?? item.imageUrl;
      existingGroup.color = existingGroup.color ?? item.color;
      existingGroup.unit = existingGroup.unit ?? item.unit;
      existingGroup.total =
        existingGroup.total === null || item.unitPrice === undefined || item.unitPrice === null
          ? null
          : existingGroup.total + item.unitPrice * item.quantity;
      if (existingGroup.unitPrice !== item.unitPrice) {
        existingGroup.unitPrice = null;
      }
    } else {
      groups.set(item.productId, {
        productId: item.productId,
        productName: item.productName,
        imageUrl: item.imageUrl,
        color: item.color,
        unit: item.unit,
        items: [item],
        totalQuantity: item.quantity,
        unitPrice: item.unitPrice ?? null,
        total:
          item.unitPrice === undefined || item.unitPrice === null
            ? null
            : item.unitPrice * item.quantity
      });
    }
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    items: [...group.items].sort(compareCartItems)
  }));
}

function compareCartItems(a: CartLineItem, b: CartLineItem) {
  const aSize = a.size ?? "";
  const bSize = b.size ?? "";
  const aNumber = Number(aSize);
  const bNumber = Number(bSize);

  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    return aNumber - bNumber;
  }

  return aSize.localeCompare(bSize);
}

function formatUnit(unit: string | undefined, quantity: number) {
  if (!unit) {
    return quantity === 1 ? "unit" : "units";
  }

  return quantity === 1 || unit.endsWith("s") ? unit : `${unit}s`;
}

function formatMoney(value: number | null) {
  return value === null ? "Waiting for seller to fill in" : `$${value.toFixed(2)}`;
}

function calculateEstimatedTotal(groups: CartProductGroup[]) {
  if (groups.length === 0 || groups.some((group) => group.total === null)) {
    return null;
  }

  return groups.reduce((total, group) => total + (group.total ?? 0), 0);
}

function getGroupSizeRange(items: CartLineItem[]) {
  const sizes = items
    .map((item) => item.size)
    .filter((size): size is string => Boolean(size));

  if (sizes.length === 0) {
    return "-";
  }

  const numericSizes = sizes.map((size) => Number(size));

  if (numericSizes.every(Number.isFinite)) {
    return `${Math.min(...numericSizes)} - ${Math.max(...numericSizes)}`;
  }

  return sizes.join(", ");
}

async function hydrateCartImages(items: CartLineItem[]) {
  const missingDetailsItems = items.filter(
    (item) => !item.imageUrl || item.unitPrice === undefined
  );

  if (missingDetailsItems.length === 0 || !hasSupabasePublicConfig()) {
    return null;
  }

  try {
    const variantIds = Array.from(
      new Set(missingDetailsItems.map((item) => item.variantId))
    );
    const { data, error } = await createSupabaseBrowserClient()
      .from("product_variants")
      .select("id,price,products(image_url,image_url_2,image_url_3)")
      .in("id", variantIds);

    if (error) {
      return null;
    }

    const detailsByVariantId = new Map(
      (data ?? []).map((variant) => [
        String(variant.id),
        {
          imageUrl: readVariantImageUrl(variant.products),
          unitPrice:
            variant.price === null || variant.price === undefined
              ? undefined
              : Number(variant.price)
        }
      ])
    );
    const hydratedItems = items.map((item) => ({
      ...item,
      imageUrl: item.imageUrl ?? detailsByVariantId.get(item.variantId)?.imageUrl,
      unitPrice: item.unitPrice ?? detailsByVariantId.get(item.variantId)?.unitPrice
    }));

    return hydratedItems.some(
      (item, index) =>
        item.imageUrl !== items[index]?.imageUrl ||
        item.unitPrice !== items[index]?.unitPrice
    )
      ? hydratedItems
      : null;
  } catch {
    return null;
  }
}

function readVariantImageUrl(products: unknown) {
  const product = Array.isArray(products) ? products[0] : products;

  if (typeof product !== "object" || product === null) {
    return undefined;
  }

  const record = product as Record<string, unknown>;

  return typeof record.image_url === "string"
    ? record.image_url
    : typeof record.image_url_2 === "string"
      ? record.image_url_2
      : typeof record.image_url_3 === "string"
        ? record.image_url_3
        : undefined;
}
