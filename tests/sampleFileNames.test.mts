import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafeSampleFileName,
  sanitizeSampleFileName
} from "../src/lib/sampleFileNames.ts";

test("keeps normal English and Chinese sample file names", () => {
  assert.equal(
    sanitizeSampleFileName("鞋底 Soles 2026.pdf"),
    "鞋底 Soles 2026.pdf"
  );
});

test("removes path traversal and URL delimiter characters", () => {
  assert.equal(
    sanitizeSampleFileName("../../sample#1?.pdf"),
    "sample-1-.pdf"
  );
});

test("only accepts already-sanitized names for destructive operations", () => {
  assert.equal(isSafeSampleFileName("Soles 2026.pdf"), true);
  assert.equal(isSafeSampleFileName("../Soles 2026.pdf"), false);
  assert.equal(isSafeSampleFileName(""), false);
});
