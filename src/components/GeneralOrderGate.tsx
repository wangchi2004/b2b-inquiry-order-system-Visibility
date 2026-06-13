"use client";

import { ReactNode, useEffect, useState } from "react";
import { GeneralOrderEntryForm } from "@/components/GeneralOrderEntryForm";
import { readVisitorOrderSession } from "@/lib/cart";

type GeneralOrderGateProps = {
  children: ReactNode;
  redirectTo?: string;
  labels?: {
    loading?: string;
    title?: string;
    description?: string;
    email?: string;
    country?: string;
    button?: string;
    emailPlaceholder?: string;
    countryPlaceholder?: string;
    emailError?: string;
    countryError?: string;
  };
};

export function GeneralOrderGate({
  children,
  redirectTo = "/order/general",
  labels
}: GeneralOrderGateProps) {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHasSession(Boolean(readVisitorOrderSession()));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (hasSession === null) {
    return (
      <div className="rounded border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        {labels?.loading ?? "Loading..."}
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-950">
          {labels?.title ?? "Enter Product Page"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {labels?.description ??
            "Please leave your email and country first. No login is required."}
        </p>
        <div className="mt-5 max-w-xl">
          <GeneralOrderEntryForm
            redirectTo={redirectTo}
            compact
            onComplete={() => setHasSession(true)}
            labels={{
              email: labels?.email,
              country: labels?.country,
              button: labels?.button,
              emailPlaceholder: labels?.emailPlaceholder,
              countryPlaceholder: labels?.countryPlaceholder,
              emailError: labels?.emailError,
              countryError: labels?.countryError
            }}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
