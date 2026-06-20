import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidCustomerEmail,
  normalizeCustomerEmail
} from "../src/lib/customerCreate.ts";

test("normalizes customer email before duplicate lookup", () => {
  assert.equal(normalizeCustomerEmail("  Buyer@Example.COM  "), "buyer@example.com");
});

test("accepts a complete email address", () => {
  assert.equal(isValidCustomerEmail("buyer@example.com"), true);
});

test("rejects incomplete email addresses", () => {
  assert.equal(isValidCustomerEmail("buyer@example"), false);
  assert.equal(isValidCustomerEmail("buyer"), false);
  assert.equal(isValidCustomerEmail(""), false);
});
