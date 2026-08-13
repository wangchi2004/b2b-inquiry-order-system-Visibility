"use client";

export function ConfirmCategoryDeleteButton({
  categoryName,
  productCount
}: {
  categoryName: string;
  productCount: number;
}) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        const message = productCount > 0
          ? `Delete "${categoryName}" and move ${productCount} assigned products to the selected replacement category?\n\n确认删除该分类并迁移其产品吗？`
          : `Delete "${categoryName}"?\n\n确认删除该分类吗？`;

        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      className="mt-3 h-10 rounded border border-red-300 px-4 text-sm font-semibold text-red-700"
    >
      Delete Category / 删除分类
    </button>
  );
}
