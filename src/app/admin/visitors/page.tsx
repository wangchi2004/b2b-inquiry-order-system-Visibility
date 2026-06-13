import Link from "next/link";
import { Header } from "@/components/Header";
import { checkAdminAccess } from "@/lib/admin";
import { getAdminVisitorSessions } from "@/lib/adminVisitors";

type AdminVisitorsPageProps = {
  searchParams: Promise<{
    password?: string;
  }>;
};

export default async function AdminVisitorsPage({
  searchParams
}: AdminVisitorsPageProps) {
  const { password } = await searchParams;
  const access = checkAdminAccess(password);

  if (!access.ok) {
    return <AdminAccessMessage reason={access.reason} />;
  }

  const { visitors, error } = await getAdminVisitorSessions();
  const totalVisitCount = visitors.reduce(
    (total, visitor) => total + visitor.visit_count,
    0
  );

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Admin / 后台</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              Visitors / 访问记录
            </h1>
          </div>
          <Link
            href={`/admin/orders?password=${encodeURIComponent(access.password)}`}
            className="inline-flex h-11 items-center justify-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-800"
          >
            Orders / 订单
          </Link>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Unique Emails / 邮箱人数</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {visitors.length}
            </p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Visits / 总访问次数</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {totalVisitCount}
            </p>
          </div>
        </div>

        {error ? (
          <p className="mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </p>
        ) : null}

        {visitors.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-950">
              No visitor records yet
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Visitor records will appear after customers enter the product page
              with email and country.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3">
                      Email / 邮箱
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3">
                      Country / 国家
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3">
                      Language / 语言
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-right">
                      Visits / 次数
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3">
                      First Seen / 首次访问
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3">
                      Last Seen / 最后访问
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-950">
                        {visitor.email}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {visitor.country ?? "-"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {formatLocale(visitor.locale)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right font-semibold text-slate-950">
                        {visitor.visit_count}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {formatDate(visitor.first_seen_at)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {formatDate(visitor.last_seen_at)}
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
        <h1 className="text-3xl font-semibold text-slate-950">
          Admin Visitors
        </h1>
        {reason === "missing_config" ? (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            ADMIN_PASSWORD is not configured. Add it to your environment
            variables before viewing the admin visitor page.
          </p>
        ) : (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Invalid admin password. Open this page with
            ?password=YOUR_ADMIN_PASSWORD.
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

function formatLocale(locale: string) {
  if (locale === "zh") {
    return "中文 / zh";
  }

  if (locale === "ko") {
    return "한국어 / ko";
  }

  if (locale === "ja") {
    return "日本語 / ja";
  }

  return "English / en";
}
