import { Header } from "@/components/Header";

export default function OrderLoading() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="mb-8">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="mt-3 h-9 w-72 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-48 rounded bg-slate-200" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="grid gap-6 rounded border border-slate-200 bg-white p-5 xl:grid-cols-[230px_280px_minmax(0,1fr)] 2xl:grid-cols-[260px_320px_minmax(0,1fr)]"
            >
              <div className="aspect-[4/3] rounded bg-slate-100" />
              <div>
                <div className="h-4 w-24 rounded bg-slate-100" />
                <div className="mt-4 h-7 w-56 rounded bg-slate-100" />
                <div className="mt-4 h-4 w-72 rounded bg-slate-100" />
                <div className="mt-4 h-16 rounded bg-slate-100" />
              </div>
              <div>
                <div className="h-4 w-48 rounded bg-slate-100" />
                <div className="mt-4 flex flex-wrap gap-3">
                  {[0, 1, 2, 3].map((box) => (
                    <div key={box} className="h-14 w-20 rounded bg-slate-100" />
                  ))}
                </div>
                <div className="mt-6 h-11 w-44 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
