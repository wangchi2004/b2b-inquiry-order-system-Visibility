import assert from "node:assert/strict";
import test from "node:test";
import {
  customerCellContentClass,
  customerInlineLinkClass
} from "../src/lib/customerTableDisplay.ts";

test("customer table cells clamp ordinary content to two lines", () => {
  assert.match(customerCellContentClass, /line-clamp-2/);
  assert.match(customerCellContentClass, /overflow-hidden/);
});

test("customer table links stay on one truncated line", () => {
  assert.match(customerInlineLinkClass, /truncate/);
  assert.match(customerInlineLinkClass, /whitespace-nowrap/);
});
