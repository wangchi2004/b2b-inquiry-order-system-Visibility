"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type CopyButtonProps = {
  value: string;
  children: ReactNode;
};

export function CopyButton({ value, children }: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("failed");
      window.setTimeout(() => setStatus("idle"), 2200);
    }
  }

  return (
    <button
      type="button"
      onClick={copyValue}
      className="h-10 rounded bg-slate-950 px-3 text-sm font-semibold text-white"
    >
      {status === "copied" ? "Copied / 已复制" : status === "failed" ? "Copy failed / 复制失败" : children}
    </button>
  );
}
