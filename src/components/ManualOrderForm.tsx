"use client";

import { useMemo, useState } from "react";
import type { ProductWithVariants } from "@/lib/types";

type ManualOrderFormProps = {
  products: ProductWithVariants[];
  password: string;
  createdAtPreview: string;
  action: (formData: FormData) => void | Promise<void>;
};

type ManualOrderRow = {
  id: string;
  variantId: string;
  quantity: number;
};

type VariantOption = {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  sku: string;
  size: string | null;
  color: string | null;
  unit: string | null;
  price: number | null;
};

const initialRows: ManualOrderRow[] = [
  {
    id: "row-1",
    variantId: "",
    quantity: 1
  }
];

export function ManualOrderForm({
  products,
  password,
  createdAtPreview,
  action
}: ManualOrderFormProps) {
  const [rows, setRows] = useState<ManualOrderRow[]>(initialRows);
  const [shippingFee, setShippingFee] = useState("");
  const variants = useMemo(() => flattenVariants(products), [products]);
  const variantById = useMemo(
    () => new Map(variants.map((variant) => [variant.id, variant])),
    [variants]
  );
  const selectedItems = rows
    .map((row) => {
      const variant = variantById.get(row.variantId);

      if (!variant) {
        return null;
      }

      return {
        row,
        variant,
        lineTotal: variant.price === null ? null : variant.price * row.quantity
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const productSubtotal = selectedItems.reduce((total, item) => total + (item.lineTotal ?? 0), 0);
  const shippingAmount = parseMoney(shippingFee) ?? 0;
  const grandTotal = productSubtotal + shippingAmount;
  const paypalFee = grandTotal * 0.05;
  const paypalCollection = grandTotal * 1.05;

  function addRow() {
    setRows((currentRows) => [
      ...currentRows,
      {
        id: crypto.randomUUID(),
        variantId: "",
        quantity: 1
      }
    ]);
  }

  function removeRow(rowId: string) {
    setRows((currentRows) => {
      const nextRows = currentRows.filter((row) => row.id !== rowId);
      return nextRows.length > 0 ? nextRows : initialRows;
    });
  }

  function updateRow(rowId: string, patch: Partial<ManualOrderRow>) {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  }

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="password" value={password} />
      <input type="hidden" name="items_json" value={JSON.stringify(buildPayloadItems(rows, variantById))} />
      <input type="hidden" name="product_subtotal" value={productSubtotal.toFixed(2)} />
      <input type="hidden" name="grand_total" value={grandTotal.toFixed(2)} />
      <input type="hidden" name="paypal_fee" value={paypalFee.toFixed(2)} />
      <input type="hidden" name="paypal_collection" value={paypalCollection.toFixed(2)} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-950">Customer / 顾客</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextInput label="Email / 客户电子邮件 *" name="customer_email" required />
            <TextInput label="Country / 国家 *" name="country" required />
            <TextInput label="Name / 姓名" name="customer_name" />
            <TextInput label="Company / 公司" name="company" />
            <TextInput label="WhatsApp" name="whatsapp" />
            <TextInput label="Note / 笔记" name="note" />
          </div>
        </section>

        <section className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-950">Order / 命令</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <DetailRow label="Order Type / 类型" value="Manual Order / 手工订单" />
            <DetailRow label="Status / 地位" value="manual_order" />
            <DetailRow label="Date / 日期" value={createdAtPreview} />
          </dl>
        </section>
      </div>

      <section className="rounded border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-slate-950">Product Details / 产品详情</h2>
          <button
            type="button"
            onClick={addRow}
            className="h-10 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-800"
          >
            Add Product / 添加产品
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="w-28 border border-slate-200 px-3 py-2">Image / 图像</th>
                <th className="min-w-72 border border-slate-200 px-3 py-2">Product / 产品</th>
                <th className="border border-slate-200 px-3 py-2">SKU</th>
                <th className="border border-slate-200 px-3 py-2">Size / 尺寸</th>
                <th className="border border-slate-200 px-3 py-2">Color / 颜色</th>
                <th className="border border-slate-200 px-3 py-2 text-right">Qty / 数量</th>
                <th className="border border-slate-200 px-3 py-2">Unit / 单元</th>
                <th className="border border-slate-200 px-3 py-2 text-right">Unit Price / 单价</th>
                <th className="border border-slate-200 px-3 py-2 text-right">Subtotal / 小计</th>
                <th className="border border-slate-200 px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const variant = variantById.get(row.variantId);
                const lineTotal = variant?.price === null || !variant
                  ? null
                  : variant.price * row.quantity;

                return (
                  <tr key={row.id} className="align-top">
                    <td className="border border-slate-200 px-3 py-3">
                      {variant?.imageUrl ? (
                        <div className="h-20 w-20 overflow-hidden rounded border border-slate-200 bg-slate-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={variant.imageUrl}
                            alt={variant.productName}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded border border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="border border-slate-200 px-3 py-3">
                      <select
                        value={row.variantId}
                        onChange={(event) => updateRow(row.id, { variantId: event.target.value })}
                        className="h-11 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                        required
                      >
                        <option value="">Select product specification</option>
                        {variants.map((variantOption) => (
                          <option key={variantOption.id} value={variantOption.id}>
                            {variantOption.productName} | {variantOption.size || "-"} | {variantOption.color || "-"} | {formatMoney(variantOption.price)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-slate-200 px-3 py-3 text-slate-700">
                      {variant?.sku ?? "-"}
                    </td>
                    <td className="border border-slate-200 px-3 py-3 text-slate-700">
                      {variant?.size ?? "-"}
                    </td>
                    <td className="border border-slate-200 px-3 py-3 text-slate-700">
                      {variant?.color ?? "-"}
                    </td>
                    <td className="border border-slate-200 px-3 py-3 text-right">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={row.quantity}
                        onChange={(event) =>
                          updateRow(row.id, {
                            quantity: Math.max(1, Number(event.target.value) || 1)
                          })
                        }
                        className="h-10 w-20 rounded border border-slate-300 px-2 text-right outline-none focus:border-slate-500"
                      />
                    </td>
                    <td className="border border-slate-200 px-3 py-3 text-slate-700">
                      {variant?.unit ?? "-"}
                    </td>
                    <td className="border border-slate-200 px-3 py-3 text-right text-slate-700">
                      {formatMoney(variant?.price ?? null)}
                    </td>
                    <td className="border border-slate-200 px-3 py-3 text-right font-semibold text-slate-950">
                      {formatMoney(lineTotal)}
                    </td>
                    <td className="border border-slate-200 px-3 py-3">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="h-9 rounded border border-red-300 px-3 text-xs font-semibold text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-5 rounded border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)]">
          <div>
            <h3 className="font-semibold text-slate-950">Shipping Details / 物流信息</h3>
            <div className="mt-3 grid gap-3">
              <TextInput label="Recipient Name / 收货人姓名" name="shipping_recipient_name" />
              <TextInput label="Phone / 电话" name="shipping_phone" />
              <TextInput label="Country / 国家地区" name="shipping_country" />
              <TextArea label="Detailed Address / 详细地址" name="shipping_address" />
              <TextArea label="Shipping Note / 物流备注" name="shipping_note" />
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4 text-sm">
            <AmountRow label="Product Subtotal / 产品小计" value={formatMoney(productSubtotal)} />
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
            <AmountRow label="Grand Total / 总计" value={formatMoney(grandTotal)} strong />
            <AmountRow label="PayPal fee (5%) / PayPal 手续费" value={formatMoney(paypalFee)} />
            <AmountRow label="PayPal Collection / PayPal收款" value={formatMoney(paypalCollection)} strong />
            <button
              type="submit"
              className="mt-4 h-11 w-full rounded bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Save Manual Order / 保存手工订单
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}

function flattenVariants(products: ProductWithVariants[]) {
  return products.flatMap((product) =>
    product.product_variants.map((variant) => ({
      id: variant.id,
      productId: product.id,
      productName: product.name,
      imageUrl: product.image_url ?? product.image_url_2 ?? product.image_url_3 ?? null,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      unit: variant.unit,
      price: variant.price
    }))
  ) satisfies VariantOption[];
}

function buildPayloadItems(
  rows: ManualOrderRow[],
  variantById: Map<string, VariantOption>
) {
  return rows
    .map((row) => {
      const variant = variantById.get(row.variantId);

      if (!variant) {
        return null;
      }

      return {
        productId: variant.productId,
        variantId: variant.id,
        productName: variant.productName,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        unit: variant.unit,
        quantity: row.quantity
      };
    })
    .filter(Boolean);
}

function TextInput({
  label,
  name,
  required = false
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <input
        name={name}
        required={required}
        className="mt-1 h-10 w-full rounded border border-slate-300 px-3 outline-none focus:border-slate-500"
      />
    </label>
  );
}

function TextArea({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <textarea
        name={name}
        rows={3}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
      />
    </label>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="break-words text-slate-950">{value}</dd>
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

function parseMoney(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatMoney(value: number | null) {
  return value === null ? "-" : `$${value.toFixed(2)}`;
}
