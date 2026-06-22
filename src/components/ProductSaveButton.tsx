"use client";

import { useFormStatus } from "react-dom";

export function ProductSaveButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="h-8 min-w-32 rounded bg-slate-950 px-3 text-xs font-semibold text-white disabled:cursor-wait disabled:bg-slate-400"
    >
      {pending
        ? isEditing
          ? "Saving... / 保存中..."
          : "Creating... / 创建中..."
        : isEditing
          ? "Save Product / 保存产品"
          : "Create Product / 创建产品"}
    </button>
  );
}
