# Compact Customer Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent long customer fields from stretching CRM table rows into large blank-looking blocks.

**Architecture:** Add a small pure helper that provides the compact cell classes, then use it in the existing customer table cell and inline-link components. Ordinary cells are limited to two lines and links to one line, while the customer detail page remains the source for complete values.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Node test runner

---

### Task 1: Add compact display rules

**Files:**
- Create: `src/lib/customerTableDisplay.ts`
- Create: `tests/customerTableDisplay.test.mts`
- Modify: `src/app/admin/customers/page.tsx`

- [x] **Step 1: Write the failing test**

Add tests asserting that regular cells use a two-line clamp and links use one-line truncation.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/customerTableDisplay.test.mts`

Expected: FAIL because `customerTableDisplay.ts` does not exist.

- [x] **Step 3: Write minimal implementation**

Export compact class constants and apply them to wrappers inside `TableCell` and `InlineLink`.

- [x] **Step 4: Run focused and project verification**

Run:

```bash
node --test tests/customerTableDisplay.test.mts
npm run lint
npm run build
```

Expected: all commands pass.

- [x] **Step 5: Verify in the browser**

Open `/admin/customers?password=admin123` and confirm customer rows remain compact even when address, INS, or website fields are long.
