import { getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { GeneralOrderGate } from "@/components/GeneralOrderGate";
import { LocaleSessionSync } from "@/components/LocaleSessionSync";
import { OrderLinkSessionSync } from "@/components/OrderLinkSessionSync";
import { ProductCatalog } from "@/components/ProductCatalog";
import { VisitorSessionRecorder } from "@/components/VisitorSessionRecorder";
import { getOrderLinkByToken } from "@/lib/orderLinks";
import { getActiveProductsWithVariants } from "@/lib/products";

type LocalizedOrderPageProps = {
  params: Promise<{
    locale: string;
    token: string;
  }>;
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
};

export default async function LocalizedOrderPage({
  params,
  searchParams
}: LocalizedOrderPageProps) {
  const [{ locale, token }, { category, q }] = await Promise.all([
    params,
    searchParams
  ]);
  const common = await getTranslations("Common");
  const catalog = await getTranslations("Catalog");
  const home = await getTranslations("Home");
  const staticCategoryNames = catalog.raw("categoryNames") as Record<string, string>;
  const [{ products, categoryTranslations, error }, orderLink] = await Promise.all([
    getActiveProductsWithVariants(locale),
    getOrderLinkByToken(token)
  ]);
  const linkedCustomer =
    orderLink.status === "valid" || orderLink.status === "expired"
      ? orderLink.customer
      : null;
  const orderLinkSession =
    orderLink.status === "valid" || orderLink.status === "expired"
      ? {
          token: orderLink.token,
          status: orderLink.status,
          message: orderLink.message,
          customer: orderLink.customer
        }
      : null;
  const shouldRequireVisitorInfo = !linkedCustomer;
  const basePath = `/${locale}/order/${encodeURIComponent(token)}`;
  const productContent = (
    <>
      <VisitorSessionRecorder locale={locale} customer={linkedCustomer} />
      {error ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
      {!error && products.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-950">
            {catalog("noMatchingProducts")}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {catalog("tryAnother")}
          </p>
        </div>
      ) : null}
      {products.length > 0 ? (
        <ProductCatalog
          products={products}
          basePath={basePath}
          selectedCategory={category ?? "all"}
          searchQuery={q ?? ""}
          labels={{
            categories: catalog("categories"),
            all: catalog("all"),
            search: common("search"),
            clear: common("clear"),
            searchPlaceholder: catalog("searchPlaceholder"),
            showing: catalog("showing", {
              filtered: "{filtered}",
              total: "{total}"
            }),
            noMatchingProducts: catalog("noMatchingProducts"),
            tryAnother: catalog("tryAnother"),
            categoryNames: {
              ...categoryTranslations,
              ...staticCategoryNames
            },
            productCard: {
              addToInquiryList: common("addToInquiryList"),
              viewDetails: common("viewDetails"),
              product: common("product"),
              color: catalog("color"),
              material: catalog("material"),
              moq: catalog("moq"),
              sizeRange: catalog("sizeRange"),
              price: catalog("price"),
              pricePending: catalog("pricePending"),
              selectQuantityBySize: catalog("selectQuantityBySize", {
                unit: "{unit}"
              }),
              selected: catalog("selected", {
                quantity: "{quantity}"
              }),
              noVariants: catalog("noVariants"),
              added: catalog("added"),
              enterQuantity: catalog("enterQuantity")
            }
          }}
        />
      ) : null}
    </>
  );

  return (
    <main className="min-h-screen">
      <LocaleSessionSync locale={locale} />
      <OrderLinkSessionSync session={orderLinkSession} />
      <Header
        homeHref={`/${locale}`}
        cartHref={`/${locale}/cart`}
        labels={{
          siteName: common("siteName"),
          cart: common("cart")
        }}
      />
      <section className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="mb-8">
          <p className="text-sm text-slate-500">{catalog("privateOrderLink")}</p>
          <h1 className="text-3xl font-semibold text-slate-950">
            {catalog("title")}
          </h1>
          {linkedCustomer ? (
            <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <p className="font-semibold">
                Welcome, {linkedCustomer.name ?? linkedCustomer.email}
              </p>
              {linkedCustomer.email ? (
                <p className="mt-1 text-emerald-800">{linkedCustomer.email}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              {catalog("generalPage")}
            </p>
          )}
          {orderLink.status === "expired" ? (
            <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {orderLink.message}
            </div>
          ) : null}
          {orderLink.status === "invalid" ? (
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {catalog("invalidLink")}
            </div>
          ) : null}
        </div>
        {shouldRequireVisitorInfo ? (
          <GeneralOrderGate
            redirectTo={basePath}
            labels={{
              title: home("enterTitle"),
              description: home("enterDescription"),
              email: common("email"),
              country: common("country"),
              button: home("enterButton"),
              emailPlaceholder: home("emailPlaceholder"),
              countryPlaceholder: home("countryPlaceholder"),
              emailError: home("emailError"),
              countryError: home("countryError")
            }}
          >
            {productContent}
          </GeneralOrderGate>
        ) : (
          productContent
        )}
      </section>
    </main>
  );
}
