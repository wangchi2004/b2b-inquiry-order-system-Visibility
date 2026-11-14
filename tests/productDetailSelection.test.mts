import assert from "node:assert/strict";
import test from "node:test";
import { detailCartItem, minimumDetailQuantity, variantColor, variantUnavailableReason } from "../src/lib/productDetailSelection.ts";
import type { ProductWithVariants } from "../src/lib/types.ts";

const product: ProductWithVariants = {
  id: "p1", name: "Repair sole", slug: "repair-sole", category: "Replacement Soles", description: null,
  image_url: null, image_url_2: null, image_url_3: null, material: null, color: null,
  status: "active", created_at: "", updated_at: "", moq: 3,
  product_variants: [
    { id: "white42", product_id: "p1", sku: "W42", size: "42", color: "White", unit: "pair", price: 9.5, stock_status: "in_stock", created_at: "", updated_at: "" },
    { id: "black42", product_id: "p1", sku: "B42", size: "42", color: "Black", unit: "pair", price: 11, stock_status: "out_of_stock", created_at: "", updated_at: "" },
  ],
};
test("detail cart keeps selected variant SKU, color and database price together", () => {
  const item = detailCartItem(product, "white42", 3);
  assert.equal(item.sku, "W42"); assert.equal(item.size, "42"); assert.equal(item.color, "White");
  assert.equal(item.unitPrice, 9.5); assert.equal(item.quantity, 3);
  assert.throws(() => detailCartItem(product, "black42", 3), /out of stock/);
  assert.throws(() => detailCartItem(product, "invented", 3), /not available/);
  assert.throws(() => detailCartItem({ ...product, status: "inactive" }, "white42", 3), /unavailable/);
});
test("detail quantity honors stored MOQ, integers and merged-cart upper bound", () => {
  for (const qty of [0, -1, 2, 3.5, NaN, Infinity, 100001]) assert.throws(() => detailCartItem(product, "white42", qty), /whole quantity/);
  assert.throws(() => detailCartItem(product, "white42", 3, 99998), /cart limit/);
  assert.equal(detailCartItem(product, "white42", 3, 99997).quantity, 3);
  assert.equal(minimumDetailQuantity({ moq: null }), 1); // Input lower bound, not an invented MOQ label.
});
test("missing, negative or non-finite prices block purchase, zero is a real price", () => {
  const v = product.product_variants[0];
  for (const price of [null, -1, NaN, Infinity]) assert.match(variantUnavailableReason({ ...v, price })!, /price/);
  assert.equal(variantUnavailableReason({ ...v, price: 0 }), null);
  assert.equal(variantUnavailableReason({ ...v, stock_status: "preorder" }), null);
  assert.match(variantUnavailableReason({ ...v, stock_status: "unknown" })!, /availability/);
});
test("color uses variant data first and does not manufacture a missing color", () => {
  assert.equal(variantColor({ color: "Brown" }, product.product_variants[0]), "White");
  assert.equal(variantColor({ color: null }, { ...product.product_variants[0], color: null }), "Not specified");
  assert.equal(variantColor({ color: "Brown" }, { ...product.product_variants[0], color: null }), "Brown");
});
