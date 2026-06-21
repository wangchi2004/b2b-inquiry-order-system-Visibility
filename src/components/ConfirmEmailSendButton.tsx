"use client";

import { useFormStatus } from "react-dom";

export function ConfirmEmailSendButton({
  recipient,
  templateName,
  disabled = false
}: {
  recipient: string;
  templateName: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      onClick={(event) => {
        if (disabled || pending) {
          event.preventDefault();
          return;
        }

        const confirmed = window.confirm(
          `Send email to ${recipient}\nTemplate: ${templateName}\n\nConfirm sending?`
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
      className="inline-flex h-11 items-center justify-center bg-slate-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {pending ? "Sending... / 发送中..." : "Send Email / 发送邮件"}
    </button>
  );
}
