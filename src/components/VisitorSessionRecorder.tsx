"use client";

import { useEffect } from "react";
import { readVisitorOrderSession } from "@/lib/cart";

type VisitorSessionRecorderProps = {
  locale?: string;
  customer?: {
    email?: string | null;
    country?: string | null;
  } | null;
};

export function VisitorSessionRecorder({
  locale = "en",
  customer
}: VisitorSessionRecorderProps) {
  useEffect(() => {
    const visitorSession = readVisitorOrderSession();
    const email = customer?.email ?? visitorSession?.email;
    const country = customer?.country ?? visitorSession?.country;

    if (!email || !country) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCountry = country.trim();
    const normalizedLocale = ["en", "ko", "ja", "zh"].includes(locale)
      ? locale
      : "en";
    const sessionKey = `visitor-recorded:${normalizedEmail}:${normalizedLocale}`;

    if (window.sessionStorage.getItem(sessionKey)) {
      return;
    }

    window.sessionStorage.setItem(sessionKey, "1");

    fetch("/api/visitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: normalizedEmail,
        country: normalizedCountry,
        locale: normalizedLocale
      }),
      keepalive: true
    })
      .then(async (response) => {
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean }
          | null;

        if (!response.ok || result?.ok === false) {
          window.sessionStorage.removeItem(sessionKey);
        }
      })
      .catch((error) => {
        console.warn("Visitor session was not recorded", error);
        window.sessionStorage.removeItem(sessionKey);
      });
  }, [customer?.country, customer?.email, locale]);

  return null;
}
