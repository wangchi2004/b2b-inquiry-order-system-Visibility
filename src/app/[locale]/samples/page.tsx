import { readdir } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";

type Locale = "en" | "ko" | "ja";

type PageProps = {
  params: Promise<{ locale: string }> | { locale: string };
};

type SampleFile = {
  fileName: string;
  href: string;
  title: string;
};

export const dynamic = "force-dynamic";

const supportedLocales: Locale[] = ["en", "ko", "ja"];

const copy = {
  en: {
    eyebrow: "PDF catalog",
    title: "Catalog Files",
    description: "Open a PDF online or download it for later.",
    empty: "No PDF files found yet.",
    file: "File",
    actions: "Actions",
    view: "View",
    download: "Download",
    home: "Home",
  },
  ko: {
    eyebrow: "PDF 카탈로그",
    title: "샘플 파일 목록",
    description: "PDF를 온라인으로 보거나 나중에 다운로드할 수 있습니다.",
    empty: "아직 PDF 파일이 없습니다.",
    file: "파일",
    actions: "작업",
    view: "보기",
    download: "다운로드",
    home: "홈",
  },
  ja: {
    eyebrow: "PDFカタログ",
    title: "サンプルファイル一覧",
    description: "PDFをオンラインで閲覧、またはダウンロードできます。",
    empty: "PDFファイルはまだありません。",
    file: "ファイル",
    actions: "操作",
    view: "表示",
    download: "ダウンロード",
    home: "ホーム",
  },
} satisfies Record<Locale, Record<string, string>>;

function getLocale(locale: string): Locale {
  if (supportedLocales.includes(locale as Locale)) {
    return locale as Locale;
  }

  notFound();
}

function titleFromFileName(fileName: string) {
  const name = fileName.replace(/\.pdf$/i, "");
  return decodeURIComponent(name)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

async function getPdfFiles(): Promise<SampleFile[]> {
  try {
    const publicDir = path.join(process.cwd(), "public");
    const entries = await readdir(publicDir, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
      .map((entry) => ({
        fileName: entry.name,
        href: `/${encodeURIComponent(entry.name)}`,
        title: titleFromFileName(entry.name),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  } catch {
    return [];
  }
}

export default async function SamplesPage({ params }: PageProps) {
  const resolvedParams = await params;
  const locale = getLocale(resolvedParams.locale);
  const t = copy[locale];
  const files = await getPdfFiles();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{t.title}</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">{t.description}</p>
        </div>
        <Link
          href={`/${locale}`}
          className="inline-flex h-11 items-center justify-center border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 hover:border-slate-500"
        >
          {t.home}
        </Link>
      </div>

      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="grid grid-cols-[1fr_auto] border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
          <div className="px-4 py-3">{t.file}</div>
          <div className="px-4 py-3 text-right">{t.actions}</div>
        </div>

        {files.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-600">{t.empty}</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {files.map((file) => (
              <div
                key={file.fileName}
                className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <p className="font-semibold text-slate-950">{file.title}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{file.fileName}</p>
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <a
                    href={file.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 min-w-24 items-center justify-center border border-slate-300 px-4 text-sm font-semibold text-slate-900 hover:border-slate-500"
                  >
                    {t.view}
                  </a>
                  <a
                    href={file.href}
                    download={file.fileName}
                    className="inline-flex h-10 min-w-24 items-center justify-center bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    {t.download}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
