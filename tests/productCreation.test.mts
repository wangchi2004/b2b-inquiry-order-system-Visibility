import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNewProductSlug,
  productCreateErrorMessage
} from "../src/lib/productCreation.ts";

test("repeated submissions for the same product name use the same slug", () => {
  assert.equal(buildNewProductSlug("  Gucci Ace Sole  "), "gucci-ace-sole");
  assert.equal(buildNewProductSlug("Gucci Ace Sole"), "gucci-ace-sole");
});

test("duplicate product slugs return a clear message instead of creating a numbered copy", () => {
  assert.equal(
    productCreateErrorMessage({
      code: "23505",
      message: "duplicate key value violates unique constraint products_slug_key"
    }, "Gucci Ace Sole"),
    'A product named "Gucci Ace Sole" already exists. Open the existing product instead of clicking Create again.'
  );
});
