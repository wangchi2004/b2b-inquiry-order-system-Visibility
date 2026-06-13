"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  readVisitorOrderSession,
  setContinueShoppingPath,
  setVisitorOrderSession
} from "@/lib/cart";

type GeneralOrderEntryFormProps = {
  redirectTo?: string;
  compact?: boolean;
  onComplete?: () => void;
  showLanguageSelect?: boolean;
  defaultLocale?: string;
  localeRedirects?: Record<string, string>;
  labels?: {
    language?: string;
    email?: string;
    country?: string;
    button?: string;
    emailPlaceholder?: string;
    countryPlaceholder?: string;
    emailError?: string;
    countryError?: string;
  };
};

export function GeneralOrderEntryForm({
  redirectTo = "/order/general",
  compact = false,
  onComplete,
  showLanguageSelect = false,
  defaultLocale = "en",
  localeRedirects,
  labels
}: GeneralOrderEntryFormProps) {
  const router = useRouter();
  const savedSession =
    typeof window === "undefined" ? null : readVisitorOrderSession();
  const [email, setEmail] = useState(savedSession?.email ?? "");
  const [country, setCountry] = useState(savedSession?.country ?? "");
  const [selectedLocale, setSelectedLocale] = useState(defaultLocale);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    const normalizedCountry = country.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(labels?.emailError ?? "Please enter a valid email address.");
      return;
    }

    if (!normalizedCountry) {
      setError(labels?.countryError ?? "Please enter your country.");
      return;
    }

    setVisitorOrderSession({
      email: normalizedEmail,
      country: normalizedCountry
    });
    const nextPath = localeRedirects?.[selectedLocale] ?? redirectTo;
    setContinueShoppingPath(nextPath);
    setError("");

    if (onComplete) {
      onComplete();
      return;
    }

    router.push(nextPath);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        compact
          ? "space-y-4"
          : "max-w-xl rounded border border-slate-200 bg-white p-6 shadow-sm"
      }
    >
      {showLanguageSelect ? (
        <div>
          <label className="block text-sm font-semibold text-slate-800">
            {labels?.language ?? "Language"}
            <select
              value={selectedLocale}
              onChange={(event) => setSelectedLocale(event.target.value)}
              className="mt-2 h-12 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
            >
              <option value="en">English</option>
              <option value="ko">한국어</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
            </select>
          </label>
        </div>
      ) : null}
      <div>
        <label className="block text-sm font-semibold text-slate-800">
          {labels?.email ?? "Email"}
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            placeholder={labels?.emailPlaceholder ?? "buyer@example.com"}
            className="mt-2 h-12 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
            required
          />
        </label>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-800">
          {labels?.country ?? "Country"}
          <input
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
              setError("");
            }}
            placeholder={labels?.countryPlaceholder ?? "United States"}
            className="mt-2 h-12 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
            required
          />
        </label>
      </div>
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="h-12 w-full rounded bg-slate-950 px-4 text-sm font-semibold text-white"
      >
        {labels?.button ?? "Enter Product Page"}
      </button>
    </form>
  );
}
