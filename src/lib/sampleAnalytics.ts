"use client";

const SAMPLE_VISITOR_ID_KEY = "sample-visitor-id";
const SUPPORTED_LOCALES = new Set(["en", "ko", "ja", "zh"]);

type SampleAnalyticsEvent = {
  eventName: "page_view" | "view_details";
  locale?: string;
  productId?: string;
  productName?: string;
};

export function recordSampleAnalytics(event: SampleAnalyticsEvent) {
  if (typeof window === "undefined") {
    return;
  }

  const visitorId = getSampleVisitorId();
  const locale = normalizeLocale(event.locale ?? getLocaleFromPath(window.location.pathname));
  const pagePath = `${window.location.pathname}${window.location.search}`;

  if (event.eventName === "page_view" && wasRecentlyRecorded(pagePath)) {
    return;
  }

  fetch("/api/sample-analytics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      visitorId,
      locale,
      pagePath,
      eventName: event.eventName,
      productId: event.productId,
      productName: event.productName
    }),
    keepalive: true
  }).catch((error) => {
    console.warn("Sample analytics was not recorded", error);
  });
}

function getSampleVisitorId() {
  const existingVisitorId = window.localStorage.getItem(SAMPLE_VISITOR_ID_KEY);

  if (existingVisitorId) {
    return existingVisitorId;
  }

  const visitorId = crypto.randomUUID();
  window.localStorage.setItem(SAMPLE_VISITOR_ID_KEY, visitorId);

  return visitorId;
}

function wasRecentlyRecorded(pagePath: string) {
  const key = `sample-page-view:${pagePath}`;
  const now = Date.now();
  const lastRecordedAt = Number(window.sessionStorage.getItem(key) ?? 0);

  if (Number.isFinite(lastRecordedAt) && now - lastRecordedAt < 5000) {
    return true;
  }

  window.sessionStorage.setItem(key, String(now));

  return false;
}

function getLocaleFromPath(pathname: string) {
  return pathname.split("/").filter(Boolean)[0];
}

function normalizeLocale(locale?: string) {
  const normalizedLocale = locale?.toLowerCase();

  return normalizedLocale && SUPPORTED_LOCALES.has(normalizedLocale)
    ? normalizedLocale
    : "en";
}
