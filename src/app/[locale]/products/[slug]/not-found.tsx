import Link from "next/link";
export default function ProductNotFound() {
  return <main className="mx-auto min-h-screen max-w-xl bg-white px-4 py-12"><h1 className="text-2xl font-semibold">Product not available</h1><p className="mt-3 leading-7 text-slate-600">This product could not be found or is no longer listed.</p><Link href="/en/search" className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-blue-700 px-5 font-medium text-white">Browse products</Link></main>;
}
