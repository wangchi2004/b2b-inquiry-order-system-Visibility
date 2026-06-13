import { getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { GeneralOrderEntryForm } from "@/components/GeneralOrderEntryForm";

type LocalizedHomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocalizedHomePage({
  params
}: LocalizedHomePageProps) {
  const { locale } = await params;
  const common = await getTranslations("Common");
  const home = await getTranslations("Home");

  return (
    <main className="min-h-screen">
      <Header
        homeHref={`/${locale}`}
        cartHref={`/${locale}/cart`}
        labels={{
          siteName: common("siteName"),
          cart: common("cart")
        }}
      />
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[1fr_420px] lg:items-start">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            {home("eyebrow")}
          </p>
          <h1 className="text-4xl font-semibold text-slate-950">
            {home("title")}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            {home("description")}
          </p>
          <div className="mt-4 rounded border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">
              {home("contact")}
            </h2>
            <div className="mt-3 grid gap-2">
              <p>
                <span className="font-semibold text-slate-900">Instagram: </span>
                <a
                  href="https://www.instagram.com/wangchi.2004/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 underline-offset-4 hover:underline"
                >
                  @wangchi.2004
                </a>
              </p>
              <p>
                <span className="font-semibold text-slate-900">WeChat: </span>
                qtd018
              </p>
              <p>
                <span className="font-semibold text-slate-900">WhatsApp: </span>
                <a
                  href="https://wa.me/85256976770"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 underline-offset-4 hover:underline"
                >
                  +852 5697 6770
                </a>
              </p>
            </div>
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-xl font-semibold text-slate-950">
            {home("enterTitle")}
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            {home("enterDescription")}
          </p>
          <GeneralOrderEntryForm
            redirectTo={`/${locale}/order/general`}
            labels={{
              email: common("email"),
              country: common("country"),
              button: home("enterButton"),
              emailPlaceholder: home("emailPlaceholder"),
              countryPlaceholder: home("countryPlaceholder"),
              emailError: home("emailError"),
              countryError: home("countryError")
            }}
          />
        </div>
      </section>
    </main>
  );
}
