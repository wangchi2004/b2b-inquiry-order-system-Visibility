import Link from "next/link";
import { Header } from "@/components/Header";
import { getCatalogFiles, type CatalogFile } from "@/data/catalog";

type SupportedLocale = "en" | "ko" | "ja" | "zh";

type CatalogCopy = {
  siteName: string;
  catalogNav: string;
  cart: string;
  title: string;
  description: string;
  empty: string;
  download: string;
  backHome: string;
};

const copy: Record<SupportedLocale, CatalogCopy> = {
  en: {
    siteName: "B2B Inquiry Order System",
    catalogNav: "Samples",
    cart: "Inquiry List",
    title: "Sample Downloads",
    description: "Download the sample files currently available.",
    empty: "No sample files are available yet.",
    download: "Download",
    backHome: "Back to home"
  },
  zh: {
    siteName: "B2B 询盘订货系统",
    catalogNav: "样本下载",
    cart: "询盘清单",
    title: "样本下载",
    description: "这里显示样本文件夹中的全部文件，点击即可下载。",
    empty: "样本文件夹中暂时没有文件。",
    download: "下载",
    backHome: "返回首页"
  },
  ja: {
    siteName: "B2B Inquiry Order System",
    catalogNav: "サンプル",
    cart: "お問い合わせリスト",
    title: "サンプルダウンロード",
    description: "現在のサンプルファイルをダウンロードできます。",
    empty: "サンプルファイルはまだありません。",
    download: "ダウンロード",
    backHome: "ホームへ戻る"
  },
  ko: {
    siteName: "B2B Inquiry Order System",
    catalogNav: "샘플",
    cart: "문의 목록",
    title: "샘플 다운로드",
    description: "현재 제공되는 샘플 파일을 다운로드할 수 있습니다.",
    empty: "아직 샘플 파일이 없습니다.",
    download: "다운로드",
    backHome: "홈으로 돌아가기"
  }
};

export async function CatalogCenter({ locale = "en" }: { locale?: string }) {
  const normalizedLocale: SupportedLocale =
    locale === "zh" || locale === "ja" || locale === "ko" ? locale : "en";
  const labels = copy[normalizedLocale];
  const files = await getCatalogFiles();
  const homeHref = `/${normalizedLocale}`;

  return (
    <main className="min-h-screen bg-slate-50">
      <Header
        homeHref={homeHref}
        catalogHref={`/${normalizedLocale}/catalog`}
        cartHref={`/${normalizedLocale}/cart`}
        labels={{
          siteName: labels.siteName,
          catalog: labels.catalogNav,
          cart: labels.cart
        }}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {labels.title}
        </h1>
        <p className="mt-3 text-base text-slate-600">{labels.description}</p>

        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {files.length > 0 ? (
            <ul className="divide-y divide-slate-200">
              {files.map((file) => (
                <CatalogFileRow key={file.name} file={file} labels={labels} />
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              {labels.empty}
            </p>
          )}
        </section>

        <div className="mt-8 border-t border-slate-200 pt-6 text-sm">
          <Link
            href={homeHref}
            className="font-semibold text-blue-700 hover:underline"
          >
            ← {labels.backHome}
          </Link>
        </div>
      </div>
    </main>
  );
}

function CatalogFileRow({
  file,
  labels
}: {
  file: CatalogFile;
  labels: CatalogCopy;
}) {
  return (
    <li className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 px-1 text-[11px] font-bold text-slate-700">
          {file.extension}
        </div>
        <p className="break-all text-sm font-semibold text-slate-950 sm:text-base">
          {file.name}
        </p>
      </div>
      <a
        href={file.href}
        download={file.name}
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        {labels.download}
      </a>
    </li>
  );
}
