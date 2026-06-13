import type { CartLineItem } from "@/lib/types";
import { getCartItemKey } from "@/lib/cart";

type CartItemProps = {
  item: CartLineItem;
  onQuantityChange: (itemKey: string, quantity: number) => void;
  onRemove: (itemKey: string) => void;
};

export function CartItem({ item, onQuantityChange, onRemove }: CartItemProps) {
  const itemKey = getCartItemKey(item);

  return (
    <div className="grid gap-4 border-b border-slate-200 py-4 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="font-medium text-slate-950">{item.productName}</p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase text-slate-400">SKU</dt>
            <dd className="break-words">{item.sku ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-400">Size</dt>
            <dd>{item.size ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-400">Color</dt>
            <dd>{item.color ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-400">Unit</dt>
            <dd>{item.unit ?? "-"}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <button
          type="button"
          onClick={() => onQuantityChange(itemKey, item.quantity - 1)}
          className="h-10 w-10 rounded border border-slate-300 text-lg font-medium text-slate-700"
          aria-label={`Decrease ${item.productName} quantity`}
        >
          -
        </button>
        <input
          type="number"
          min="1"
          inputMode="numeric"
          value={item.quantity}
          onChange={(event) => onQuantityChange(itemKey, Number(event.target.value))}
          className="h-10 w-20 rounded border border-slate-300 px-3 text-center text-sm outline-none focus:border-slate-500"
          aria-label={`${item.productName} quantity`}
        />
        <button
          type="button"
          onClick={() => onQuantityChange(itemKey, item.quantity + 1)}
          className="h-10 w-10 rounded border border-slate-300 text-lg font-medium text-slate-700"
          aria-label={`Increase ${item.productName} quantity`}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => onRemove(itemKey)}
          className="h-10 rounded border border-red-200 px-3 text-sm font-medium text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
