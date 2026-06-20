# Manual Customer Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin page for manually creating a complete CRM customer record without allowing duplicate email addresses.

**Architecture:** Add a protected `/admin/customers/new` server page and server action. Normalize and validate email through a small tested helper, query for an existing customer before insert, and redirect to either the existing or newly created customer detail page.

**Tech Stack:** Next.js App Router, TypeScript, Supabase service-role client, Tailwind CSS, Node test runner.

---

### Task 1: Email validation policy

**Files:**
- Create: `src/lib/customerCreate.ts`
- Test: `tests/customerCreate.test.ts`

- [ ] Write tests proving emails are trimmed/lowercased and invalid addresses are rejected.
- [ ] Run the test and confirm it fails because the helper does not exist.
- [ ] Add the minimal helper implementation.
- [ ] Run the test and confirm it passes.

### Task 2: Protected create-customer page

**Files:**
- Create: `src/app/admin/customers/new/page.tsx`
- Create: `src/app/admin/customers/new/actions.ts`

- [ ] Build the bilingual form using the same CRM fields and styling as the edit page.
- [ ] Require a valid admin password and valid email.
- [ ] Look up email case-insensitively before insert.
- [ ] Redirect duplicate emails to the existing customer edit page.
- [ ] Insert new records with `manual`, `prospecting`, and `new` defaults.
- [ ] Redirect successful creation to the new customer edit page.

### Task 3: Customer database entry point and verification

**Files:**
- Modify: `src/app/admin/customers/page.tsx`

- [ ] Add a `New Customer / 新增客户` link in the customer database toolbar.
- [ ] Run the focused test and ESLint.
- [ ] Run `npm run build` and confirm all routes compile.
- [ ] Open the local page and verify the form and navigation.
