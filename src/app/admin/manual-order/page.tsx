import Link from "next/link";
import { Header } from "@/components/Header";
import { ManualOrderForm } from "@/components/ManualOrderForm";
import { checkAdminAccess } from "@/lib/admin";
import { getAdminProducts } from "@/lib/adminProducts";
import { createManualOrder } from "./actions";

type ManualOrderPageProps = {
  searchParams: Promise<{
    password?: string;
    message?: string;
  }>;
};

export default async function ManualOrderPage({ searchParams }: ManualOrderPageProps) {
  const { password, message } = await searchParams;
  const access = checkAdminAccess(password);

  if (!access.ok) {
    return <AdminAccessMessage reason={access.reason} />;
  }

  const products = await getAdminProducts();
  const activeProducts = products.filter((product) => product.status === "active");

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Admin / Manual order</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              Manual Order Quote / 手工订单报价
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Create an order from WhatsApp, email, phone, or other channels. It will be saved in Orders as manual_order.
            </p>
          </div>
          <Link
            href={`/admin/orders?password=${encodeURIComponent(access.password)}`}
            className="inline-flex h-11 items-center justify-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-800"
          >
            Back to Orders / 返回订单
          </Link>
        </div>

        {message ? (
          <p className="mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {message}
          </p>
        ) : null}

        {activeProducts.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-950">No active products</h2>
            <p className="mt-2 text-sm text-slate-600">
              Add active products and specifications before creating a manual order.
            </p>
          </div>
        ) : (
          <ManualOrderForm
            products={activeProducts}
            password={access.password}
            createdAtPreview={formatDateTime(new Date())}
            action={createManualOrder}
          />
        )}
      </section>
    </main>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function AdminAccessMessage({
  reason
}: {
  reason: "missing_config" | "unauthorized";
}) {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-slate-950">Manual Order</h1>
        {reason === "missing_config" ? (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            ADMIN_PASSWORD is not configured. Add it to your environment variables before using this page.
          </p>
        ) : (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Invalid admin password. Open this page with ?password=YOUR_ADMIN_PASSWORD.
          </p>
        )}
      </section>
    </main>
  );
}
