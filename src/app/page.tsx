import { Header } from "@/components/Header";
import { GeneralOrderEntryForm } from "@/components/GeneralOrderEntryForm";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[1fr_420px] lg:items-start">
        <div className="flex flex-col gap-4">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          B2B export workflow
        </p>
        <h1 className="text-4xl font-semibold text-slate-950">
          B2B Inquiry Order System
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          A private inquiry ordering system for overseas customers to select
          products, submit quantities, and receive order confirmation by email.
          </p>
          <div className="mt-4 rounded border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Contact</h2>
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
            Login / Enter Product Page
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            Select your language, then fill in your email and country to enter the product page.
          </p>
          <GeneralOrderEntryForm
            redirectTo="/en/order/general"
            showLanguageSelect
            defaultLocale="en"
            localeRedirects={{
              en: "/en/order/general",
              ko: "/ko/order/general",
              ja: "/ja/order/general",
              zh: "/zh/order/general"
            }}
            labels={{
              language: "Language",
              button: "Login"
            }}
          />
        </div>
      </section>
    </main>
  );
}
