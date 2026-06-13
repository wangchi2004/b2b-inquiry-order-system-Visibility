import { Header } from "@/components/Header";
import { GeneralOrderGate } from "@/components/GeneralOrderGate";
import { LegacyOrderLocaleRedirect } from "@/components/LegacyOrderLocaleRedirect";
import { OrderLinkSessionSync } from "@/components/OrderLinkSessionSync";
import { ProductCatalog } from "@/components/ProductCatalog";
import { VisitorSessionRecorder } from "@/components/VisitorSessionRecorder";
import { getOrderLinkByToken } from "@/lib/orderLinks";
import { getActiveProductsWithVariants } from "@/lib/products";

type OrderPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
};

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const { token } = await params;
  const { category, q } = await searchParams;
  const [{ products, error }, orderLink] = await Promise.all([
    getActiveProductsWithVariants(),
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
  const productContent = (
    <>
      <VisitorSessionRecorder locale="en" customer={linkedCustomer} />
      {error ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
      {!error && products.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-950">
            No products available
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Add active products in Supabase to show them on this order page.
          </p>
        </div>
      ) : null}
      {products.length > 0 ? (
        <ProductCatalog
          products={products}
          basePath={`/order/${encodeURIComponent(token)}`}
          selectedCategory={category ?? "all"}
          searchQuery={q ?? ""}
        />
      ) : null}
    </>
  );

  return (
    <main className="min-h-screen">
      <LegacyOrderLocaleRedirect />
      <OrderLinkSessionSync session={orderLinkSession} />
      <Header />
      <section className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="mb-8">
          <p className="text-sm text-slate-500">Private order link</p>
          <h1 className="text-3xl font-semibold text-slate-950">
            Inquiry Order Page
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
              General inquiry order page.
            </p>
          )}
          {orderLink.status === "expired" ? (
            <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {orderLink.message}
            </div>
          ) : null}
          {orderLink.status === "invalid" ? (
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              This link is not recognized, but you can still browse products and submit a general inquiry.
            </div>
          ) : null}
        </div>
        {shouldRequireVisitorInfo ? (
          <GeneralOrderGate>{productContent}</GeneralOrderGate>
        ) : (
          productContent
        )}
      </section>
    </main>
  );
}
