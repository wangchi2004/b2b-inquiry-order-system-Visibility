import Link from "next/link";
import { Header } from "@/components/Header";
import {
  catalogCategories,
  catalogRelease,
  getCatalogFileHref,
  type CatalogCategory,
  type CatalogFile
} from "@/data/catalog";

type SupportedLocale = "en" | "ko" | "ja" | "zh";

type CatalogCopy = {
  siteName: string;
  catalogNav: string;
  cart: string;
  eyebrow: string;
  title: string;
  description: string;
  latestVersion: string;
  nextUpdate: string;
  filesAvailable: string;
  newThisIssue: string;
  newDescription: string;
  allCatalogs: string;
  updated: string;
  new: string;
  viewOnline: string;
  download: string;
  pdfLabel: string;
  backHome: string;
  categories: Record<CatalogCategory, string>;
};

const copy: Record<SupportedLocale, CatalogCopy> = {
  en: {
    siteName: "B2B Inquiry Order System",
    catalogNav: "Catalog",
    cart: "Inquiry List",
    eyebrow: "Updated every 15 days",
    title: "Catalog & Sample Center",
    description:
      "Browse the latest shoe repair material samples by category. Open a PDF online or download it for later.",
    latestVersion: "Latest version",
    nextUpdate: "Next update",
    filesAvailable: "PDF catalogs",
    newThisIssue: "New this issue",
    newDescription: "Recently added products in the current catalog release.",
    allCatalogs: "All catalogs by category",
    updated: "Updated",
    new: "New",
    viewOnline: "View online",
    download: "Download",
    pdfLabel: "PDF sample",
    backHome: "Back to home",
    categories: {
      Soles: "Soles",
      "Leather & Heel": "Leather & Heel",
      Adhesives: "Adhesives",
      "Fabrics & Insoles": "Fabrics & Insoles",
      "Tools & Accessories": "Tools & Accessories"
    }
  },
  zh: {
    siteName: "B2B 询盘订货系统",
    catalogNav: "样本中心",
    cart: "询盘清单",
    eyebrow: "每 15 天更新",
    title: "Catalog / 样本中心",
    description: "按产品分类浏览最新鞋材样本，可在线打开 PDF，也可下载保存。",
    latestVersion: "本期版本",
    nextUpdate: "下次更新",
    filesAvailable: "份 PDF 样本",
    newThisIssue: "本期新增",
    newDescription: "本期目录中最新加入的产品样本。",
    allCatalogs: "按分类查看全部样本",
    updated: "更新于",
    new: "新增",
    viewOnline: "在线查看",
    download: "下载",
    pdfLabel: "PDF 样本",
    backHome: "返回首页",
    categories: {
      Soles: "鞋底",
      "Leather & Heel": "皮革与后跟材料",
      Adhesives: "胶水",
      "Fabrics & Insoles": "网布与鞋垫",
      "Tools & Accessories": "工具与配件"
    }
  },
  ja: {
    siteName: "B2B Inquiry Order System",
    catalogNav: "カタログ",
    cart: "お問い合わせリスト",
    eyebrow: "15日ごとに更新",
    title: "カタログ・サンプルセンター",
    description:
      "靴修理材料の最新サンプルをカテゴリー別に閲覧し、PDFをオンライン表示またはダウンロードできます。",
    latestVersion: "最新バージョン",
    nextUpdate: "次回更新",
    filesAvailable: "PDFカタログ",
    newThisIssue: "今回の新商品",
    newDescription: "今回のカタログで新しく追加された商品サンプルです。",
    allCatalogs: "カテゴリー別カタログ",
    updated: "更新日",
    new: "新着",
    viewOnline: "オンライン表示",
    download: "ダウンロード",
    pdfLabel: "PDFサンプル",
    backHome: "ホームへ戻る",
    categories: {
      Soles: "ソール",
      "Leather & Heel": "革・ヒール材料",
      Adhesives: "接着剤",
      "Fabrics & Insoles": "メッシュ・インソール",
      "Tools & Accessories": "工具・付属品"
    }
  },
  ko: {
    siteName: "B2B Inquiry Order System",
    catalogNav: "카탈로그",
    cart: "문의 목록",
    eyebrow: "15일마다 업데이트",
    title: "카탈로그 · 샘플 센터",
    description:
      "최신 신발 수선 재료 샘플을 카테고리별로 확인하고 PDF를 온라인으로 보거나 다운로드하세요.",
    latestVersion: "최신 버전",
    nextUpdate: "다음 업데이트",
    filesAvailable: "PDF 카탈로그",
    newThisIssue: "이번 호 신제품",
    newDescription: "현재 카탈로그에 새로 추가된 제품 샘플입니다.",
    allCatalogs: "카테고리별 전체 카탈로그",
    updated: "업데이트",
    new: "신제품",
    viewOnline: "온라인 보기",
    download: "다운로드",
    pdfLabel: "PDF 샘플",
    backHome: "홈으로 돌아가기",
    categories: {
      Soles: "밑창",
      "Leather & Heel": "가죽 · 뒤꿈치 재료",
      Adhesives: "접착제",
      "Fabrics & Insoles": "메쉬 · 인솔",
      "Tools & Accessories": "도구 · 부자재"
    }
  }
};

export function CatalogCenter({ locale = "en" }: { locale?: string }) {
  const normalizedLocale: SupportedLocale =
    locale === "zh" || locale === "ja" || locale === "ko" ? locale : "en";
  const labels = copy[normalizedLocale];
  const homeHref = `/${normalizedLocale}`;
  const catalogHref = `/${normalizedLocale}/catalog`;
  const cartHref = `/${normalizedLocale}/cart`;
  const newFiles = catalogRelease.files.filter((file) => file.isNew);

  return (
    <main className="min-h-screen bg-slate-50">
      <Header
        homeHref={homeHref}
        catalogHref={catalogHref}
        cartHref={cartHref}
        labels={{
          siteName: labels.siteName,
          catalog: labels.catalogNav,
          cart: labels.cart
        }}
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                {labels.eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                {labels.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                {labels.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[430px]">
              <ReleaseStat
                label={labels.latestVersion}
                value={catalogRelease.versionDate}
              />
              <ReleaseStat
                label={labels.nextUpdate}
                value={catalogRelease.nextUpdateDate}
              />
              <ReleaseStat
                label={labels.filesAvailable}
                value={String(catalogRelease.files.length)}
                className="col-span-2 sm:col-span-1"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
        <section aria-labelledby="new-catalogs">
          <div className="mb-5">
            <h2 id="new-catalogs" className="text-2xl font-semibold text-slate-950">
              {labels.newThisIssue}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{labels.newDescription}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {newFiles.map((file) => (
              <CatalogCard
                key={file.id}
                file={file}
                labels={labels}
                highlighted
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="all-catalogs">
          <h2 id="all-catalogs" className="text-2xl font-semibold text-slate-950">
            {labels.allCatalogs}
          </h2>
          <div className="mt-6 space-y-9">
            {catalogCategories.map((category) => {
              const files = catalogRelease.files.filter(
                (file) => file.category === category
              );

              return (
                <div key={category}>
                  <div className="mb-4 flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-950">
                      {labels.categories[category]}
                    </h3>
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {files.length}
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {files.map((file) => (
                      <CatalogCard key={file.id} file={file} labels={labels} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="border-t border-slate-200 pt-6 text-sm text-slate-500">
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

function ReleaseStat({
  label,
  value,
  className = ""
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 p-4 ${className}`}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function CatalogCard({
  file,
  labels,
  highlighted = false
}: {
  file: CatalogFile;
  labels: CatalogCopy;
  highlighted?: boolean;
}) {
  const href = getCatalogFileHref(file.fileName);

  return (
    <article
      className={`flex h-full flex-col rounded-xl border bg-white p-5 shadow-sm ${
        highlighted ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-700">
            PDF
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {labels.pdfLabel}
            </p>
            <h4 className="mt-1 text-base font-semibold leading-6 text-slate-950">
              {file.title}
            </h4>
          </div>
        </div>
        {file.isNew ? (
          <span className="shrink-0 rounded-full bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white">
            {labels.new}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        {labels.updated} {file.updatedAt}
      </p>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          {labels.viewOnline}
        </a>
        <a
          href={href}
          download={file.fileName}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {labels.download}
        </a>
      </div>
    </article>
  );
}
