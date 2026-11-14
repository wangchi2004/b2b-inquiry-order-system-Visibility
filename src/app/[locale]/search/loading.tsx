export default function SearchLoading() {
  return <main className="min-h-screen bg-white"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">Search products</h1><p role="status" className="mt-4 text-slate-600">Loading the product collection…</p><div aria-hidden="true" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map(id => <div key={id} className="aspect-square rounded-xl bg-slate-100" />)}</div></div></main>;
}
