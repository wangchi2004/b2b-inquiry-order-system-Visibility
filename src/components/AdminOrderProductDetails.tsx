"use client";

import { useMemo, useState } from "react";
import type { AdminOrderItem } from "@/lib/adminOrders";

export type AdminOrderProductGroup = {
  key: string;
  productName: string;
  imageUrl: string | null;
  totalQuantity: number;
  items: AdminOrderItem[];
};

type AdminOrderProductDetailsProps = {
  groups: AdminOrderProductGroup[];
  orderId?: string;
  customerEmail?: string;
  password?: string;
  savedQuote?: {
    productSubtotal: number | null;
    shippingFee: number | null;
    grandTotal: number | null;
    paypalFee: number | null;
    paypalCollection: number | null;
    shippingRecipientName: string | null;
    shippingPhone: string | null;
    shippingCountry: string | null;
    shippingAddress: string | null;
    shippingNote: string | null;
    quoteUpdatedAt: string | null;
  };
  saveItemsAction?: (formData: FormData) => void | Promise<void>;
  saveAction?: (formData: FormData) => void | Promise<void>;
  sendEmailAction?: (formData: FormData) => void | Promise<void>;
};

export function AdminOrderProductDetails({
  groups,
  orderId,
  customerEmail,
  password,
  savedQuote,
  saveItemsAction,
  saveAction,
  sendEmailAction
}: AdminOrderProductDetailsProps) {
  const [shippingFee, setShippingFee] = useState(
    savedQuote?.shippingFee === null || savedQuote?.shippingFee === undefined
      ? ""
      : String(savedQuote.shippingFee)
  );
  const productSubtotal = useMemo(() => calculateProductSubtotal(groups), [groups]);
  const shippingAmount = parseMoneyInput(shippingFee);
  const grandTotal = productSubtotal === null
    ? null
    : productSubtotal + (shippingAmount ?? 0);
  const paypalFee = grandTotal === null ? null : grandTotal * 0.05;
  const paypalCollection = grandTotal === null ? null : grandTotal * 1.05;

  if (groups.length === 0) {
    return <p className="mt-4 text-sm text-slate-600">No order items found.</p>;
  }

  return (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <form action={saveItemsAction}>
          {orderId ? <input type="hidden" name="order_id" value={orderId} /> : null}
          {password ? <input type="hidden" name="password" value={password} /> : null}
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="w-28 border border-slate-200 px-3 py-2">Image</th>
                <th className="min-w-44 border border-slate-200 px-3 py-2">Product</th>
                <th className="min-w-72 border border-slate-200 px-3 py-2">SKU</th>
                <th className="min-w-28 border border-slate-200 px-3 py-2">Size</th>
                <th className="min-w-28 border border-slate-200 px-3 py-2">Color</th>
                <th className="min-w-24 border border-slate-200 px-3 py-2 text-right">Quantity</th>
                <th className="min-w-24 border border-slate-200 px-3 py-2">Unit</th>
                <th className="min-w-28 border border-slate-200 px-3 py-2 text-right">Unit Price</th>
                <th className="border border-slate-200 px-3 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) =>
                group.items.map((item, index) => {
                  const unitPrice = getUnitPrice(item);
                  const lineTotal = unitPrice === null ? null : unitPrice * item.quantity;

                  return (
                    <tr key={item.id} className="align-top">
                      {index === 0 ? (
                        <td
                          rowSpan={group.items.length}
                          className="border border-slate-200 px-3 py-3"
                        >
                          {group.imageUrl ? (
                            <div className="h-20 w-20 overflow-hidden rounded border border-slate-200 bg-slate-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={group.imageUrl}
                                alt={group.productName}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded border border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
                              No image
                            </div>
                          )}
                        </td>
                      ) : null}
                      <td className="border border-slate-200 px-3 py-2">
                        <input type="hidden" name="item_id" value={item.id} />
                        <input
                          name={`item_product_name_${item.id}`}
                          defaultValue={item.product_name}
                          className="h-9 w-full rounded border border-slate-300 px-2 text-slate-950 outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="border border-slate-200 px-3 py-2">
                        <input
                          name={`item_sku_${item.id}`}
                          defaultValue={item.sku ?? ""}
                          className="h-9 w-full rounded border border-slate-300 px-2 text-slate-700 outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="border border-slate-200 px-3 py-2">
                        <input
                          name={`item_size_${item.id}`}
                          defaultValue={item.size ?? ""}
                          className="h-9 w-full rounded border border-slate-300 px-2 text-slate-700 outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="border border-slate-200 px-3 py-2">
                        <input
                          name={`item_color_${item.id}`}
                          defaultValue={item.color ?? ""}
                          className="h-9 w-full rounded border border-slate-300 px-2 text-slate-700 outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="border border-slate-200 px-3 py-2">
                        <input
                          name={`item_quantity_${item.id}`}
                          type="number"
                          min="1"
                          step="1"
                          defaultValue={item.quantity}
                          className="h-9 w-full rounded border border-slate-300 px-2 text-right text-slate-700 outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="border border-slate-200 px-3 py-2">
                        <input
                          name={`item_unit_${item.id}`}
                          defaultValue={item.unit ?? ""}
                          className="h-9 w-full rounded border border-slate-300 px-2 text-slate-700 outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="border border-slate-200 px-3 py-2">
                        <input
                          name={`item_unit_price_${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={unitPrice ?? ""}
                          className="h-9 w-full rounded border border-slate-300 px-2 text-right text-slate-700 outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-right font-medium text-slate-950">
                        {formatMoney(lineTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {saveItemsAction ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <p className="text-xs text-slate-500">
                Edit product lines, then save before sending quote email.
              </p>
              <button
                type="submit"
                className="h-10 rounded bg-slate-950 px-4 text-sm font-semibold text-white"
              >
                Save Order Items / 保存订单明细
              </button>
            </div>
          ) : null}
        </form>
      </div>

      <div className="mt-5">
        <form
          action={saveAction}
          className="grid gap-5 rounded border border-slate-200 bg-slate-50 p-4 text-sm lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)]"
        >
          {orderId ? <input type="hidden" name="order_id" value={orderId} /> : null}
          {password ? <input type="hidden" name="password" value={password} /> : null}
          <input type="hidden" name="product_subtotal" value={moneyInputValue(productSubtotal)} />
          <input type="hidden" name="grand_total" value={moneyInputValue(grandTotal)} />
          <input type="hidden" name="paypal_fee" value={moneyInputValue(paypalFee)} />
          <input type="hidden" name="paypal_collection" value={moneyInputValue(paypalCollection)} />
          <div>
            <h3 className="font-semibold text-slate-950">
              Shipping Details / 物流信息
            </h3>
            <div className="mt-3 grid gap-3">
              <TextInput
                label="Recipient Name / 收货人姓名"
                name="shipping_recipient_name"
                defaultValue={savedQuote?.shippingRecipientName}
              />
              <TextInput
                label="Phone / 电话"
                name="shipping_phone"
                defaultValue={savedQuote?.shippingPhone}
              />
              <TextInput
                label="Country / 国家地区"
                name="shipping_country"
                defaultValue={savedQuote?.shippingCountry}
              />
              <TextArea
                label="Detailed Address / 详细地址"
                name="shipping_address"
                defaultValue={savedQuote?.shippingAddress}
              />
              <TextArea
                label="Shipping Note / 物流备注"
                name="shipping_note"
                defaultValue={savedQuote?.shippingNote}
              />
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <AmountRow label="Product Subtotal" value={formatMoney(productSubtotal)} />
            <label className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-[1fr_180px] sm:items-center">
              <span className="font-semibold text-slate-700">Shipping Fee / 运费</span>
              <input
                name="shipping_fee"
                type="number"
                min="0"
                step="0.01"
                value={shippingFee}
                onChange={(event) => setShippingFee(event.target.value)}
                placeholder="Manual input"
                className="h-10 rounded border border-slate-300 px-3 text-right outline-none focus:border-slate-500"
              />
            </label>
            <AmountRow label="Grand Total / 合计" value={formatMoney(grandTotal)} strong />
            <AmountRow label="PayPal fee (5%) / PayPal手续费" value={formatMoney(paypalFee)} />
            <AmountRow
              label="PayPal Collection / PayPal 收款"
              value={formatMoney(paypalCollection)}
              strong
            />
            {saveAction ? (
              <button
                type="submit"
                className="mt-4 h-10 w-full rounded bg-slate-950 px-4 text-sm font-semibold text-white"
              >
                Save Quote / 保存报价
              </button>
            ) : null}
            {sendEmailAction && customerEmail && orderId ? (
              <button
                type="submit"
                formAction={sendEmailAction}
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-white"
              >
                Send Reply Email / 发送回复邮件
              </button>
            ) : null}
            {savedQuote?.quoteUpdatedAt ? (
              <p className="mt-3 text-xs text-slate-500">
                Saved at {formatDateTime(savedQuote.quoteUpdatedAt)}
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

function AmountRow({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="mt-3 grid grid-cols-[1fr_auto] gap-3 first:mt-0">
      <span className={strong ? "font-bold text-slate-950" : "font-semibold text-slate-700"}>
        {label}
      </span>
      <span className={strong ? "font-bold text-slate-950" : "text-slate-950"}>
        {value}
      </span>
    </div>
  );
}

function TextInput({
  label,
  name,
  defaultValue,
  placeholder
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded border border-slate-300 px-3 outline-none focus:border-slate-500"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={3}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
      />
    </label>
  );
}

function calculateProductSubtotal(groups: AdminOrderProductGroup[]) {
  let subtotal = 0;

  for (const group of groups) {
    for (const item of group.items) {
      const unitPrice = getUnitPrice(item);

      if (unitPrice === null) {
        return null;
      }

      subtotal += unitPrice * item.quantity;
    }
  }

  return subtotal;
}

function getUnitPrice(item: AdminOrderItem) {
  return item.unit_price ?? item.product_variants?.price ?? null;
}

function parseMoneyInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatMoney(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `$${value.toFixed(2)}`;
}

function moneyInputValue(value: number | null) {
  return value === null ? "" : value.toFixed(2);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
