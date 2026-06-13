import Link from "next/link";
import { Header } from "@/components/Header";
import { checkAdminAccess } from "@/lib/admin";
import { getAdminOrders } from "@/lib/adminOrders";
import { deleteOrder } from "./actions";

type AdminOrdersPageProps = {
  searchParams: Promise<{
    password?: string;
    message?: string;
  }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const { password, message } = await searchParams;
  const access = checkAdminAccess(password);

  if (!access.ok) {
    return <AdminAccessMessage reason={access.reason} />;
  }

  const orders = await getAdminOrders();

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Admin</p>
            <h1 className="text-3xl font-semibold text-slate-950">Orders</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/admin/visitors?password=${encodeURIComponent(access.password)}`}
              className="inline-flex h-11 items-center justify-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-800"
            >
              Visitors / 访问记录
            </Link>
            <Link
              href={`/admin/manual-order?password=${encodeURIComponent(access.password)}`}
              className="inline-flex h-11 items-center justify-center rounded bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              New Manual Order / 新建手工订单
            </Link>
          </div>
        </div>

        {message ? (
          <p className="mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {message}
          </p>
        ) : null}

        {orders.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-950">No orders yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Submitted inquiry orders will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3">Order</th>
                    <th className="border-b border-slate-200 px-4 py-3">Status</th>
                    <th className="border-b border-slate-200 px-4 py-3">Customer Email</th>
                    <th className="border-b border-slate-200 px-4 py-3">Country</th>
                    <th className="border-b border-slate-200 px-4 py-3">Submitted</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-950">
                        <Link
                          href={`/admin/orders/${order.id}?password=${encodeURIComponent(access.password)}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {shortId(order.id)}
                        </Link>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            order.status === "manual_order"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {order.customer_email}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {order.country ?? "-"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right">
                        <form action={deleteOrder}>
                          <input type="hidden" name="password" value={access.password} />
                          <input type="hidden" name="order_id" value={order.id} />
                          <button
                            type="submit"
                            className="h-9 rounded border border-red-300 px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete / 删除
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
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
        <h1 className="text-3xl font-semibold text-slate-950">Admin Orders</h1>
        {reason === "missing_config" ? (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            ADMIN_PASSWORD is not configured. Add it to your environment variables
            before viewing the admin order pages.
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function shortId(value: string) {
  return value.slice(0, 8);
}
