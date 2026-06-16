"use client";

import { useEffect } from "react";
import { recordSampleAnalytics } from "@/lib/sampleAnalytics";

type SampleAnalyticsRecorderProps = {
  locale?: string;
};

export function SampleAnalyticsRecorder({
  locale = "en"
}: SampleAnalyticsRecorderProps) {
  useEffect(() => {
    recordSampleAnalytics({
      eventName: "page_view",
      locale
    });
  }, [locale]);

  return null;
}
