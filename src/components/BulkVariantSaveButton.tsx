"use client";

type BulkVariantSaveButtonProps = {
  formId: string;
  disabled?: boolean;
};

export function BulkVariantSaveButton({
  formId,
  disabled
}: BulkVariantSaveButtonProps) {
  function handleClick() {
    const form = document.getElementById(formId) as HTMLFormElement | null;

    if (!form) {
      return;
    }

    form.querySelectorAll("[data-bulk-field-input]").forEach((input) => {
      input.remove();
    });

    const fields = document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "[data-bulk-variant-id][data-bulk-variant-field]"
    );

    fields.forEach((field) => {
      const variantId = field.dataset.bulkVariantId;
      const variantField = field.dataset.bulkVariantField;

      if (!variantId || !variantField) {
        return;
      }

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = `variant:${variantId}:${variantField}`;
      input.value = field.value;
      input.dataset.bulkFieldInput = "true";
      form.appendChild(input);
    });

    form.requestSubmit();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="h-8 rounded bg-blue-600 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      Save All Specifications / 保存全部规格
    </button>
  );
}
