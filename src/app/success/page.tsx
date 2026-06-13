import { Header } from "@/components/Header";

export default function SuccessPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-slate-950">
          Inquiry Submitted
        </h1>
        <p className="mt-4 text-slate-600">
          Thank you. Your inquiry order has been submitted successfully.
        </p>
      </section>
    </main>
  );
}
