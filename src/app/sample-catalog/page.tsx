const pdfPath = "/downloads/sample-catalog.pdf";
const siteUrl = "https://www.wangchi2004.com";
const pdfUrl = `${siteUrl}${pdfPath}`;
const pageUrl = `${siteUrl}/sample-catalog`;

export default function SampleCatalogPdfPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-slate-950">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sample catalog</p>
      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold">Shoe Repair Materials PDF Catalog</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Share this page or the direct PDF file with customers by email. The PDF is for sample viewing only.
          </p>
        </div>
        <a
          href="/"
          className="inline-flex h-11 items-center justify-center rounded border border-slate-300 px-5 text-sm font-semibold hover:bg-slate-50"
        >
          Home
        </a>
      </div>

      <section className="mt-8 rounded border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">PDF links</h2>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href={pdfPath}
            target="_blank"
            className="inline-flex h-12 items-center justify-center rounded bg-slate-950 px-6 text-sm font-bold text-white hover:bg-slate-800"
          >
            Open PDF Catalog
          </a>
          <a
            href={pdfPath}
            download
            className="inline-flex h-12 items-center justify-center rounded border border-slate-300 px-6 text-sm font-bold hover:bg-slate-50"
          >
            Download PDF
          </a>
          <a
            href="/en/samples"
            className="inline-flex h-12 items-center justify-center rounded border border-slate-300 px-6 text-sm font-bold hover:bg-slate-50"
          >
            View Online Samples
          </a>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">Page link</p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900">{pageUrl}</p>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">Direct PDF link</p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900">{pdfUrl}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Email copy</h2>
        <div className="mt-4 whitespace-pre-line rounded border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
{`Dear customer,

Here is our shoe repair materials sample catalog PDF:
${pdfUrl}

You can also view product samples online:
${siteUrl}/en/samples

If you are interested in any item, please send us the product name, size, color, and quantity.

Best regards`}
        </div>
      </section>
    </main>
  );
}
