# Country Email Campaigns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a country-matched, previewable, manually confirmed email campaign page with featured products, Resend delivery, send history, and an atomic 15-day cooldown.

**Architecture:** Pure TypeScript helpers own country matching, eligibility, and escaped email rendering. Supabase stores templates, product choices, and immutable send logs; an RPC atomically reserves a send before Resend is called. Server actions mutate data while one protected server page provides send, template-management, and history views.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/Postgres, Resend, Tailwind CSS, Node test runner

---

### Task 1: Pure campaign rules and rendering

**Files:**
- Create: `tests/emailCampaign.test.mts`
- Create: `src/lib/emailCampaign.ts`

- [ ] Write failing tests for country alias matching, English fallback, send eligibility, cooldown exemption, and escaped HTML rendering.
- [ ] Run `node --test --experimental-strip-types tests/emailCampaign.test.mts` and confirm failure because the module does not exist.
- [ ] Implement typed matching, eligibility, cooldown, website URL, and HTML/text rendering helpers.
- [ ] Re-run the focused test and confirm all cases pass.

### Task 2: Supabase schema and atomic reservation

**Files:**
- Create: `supabase/email_campaign_templates.sql`

- [ ] Add `email_templates`, `email_template_products`, and `email_send_logs` with indexes and timestamps.
- [ ] Add a product-count trigger that rejects more than six featured products.
- [ ] Add `reserve_email_campaign_send` using a normalized-email advisory lock, 15-day successful-send check, 15-minute pending reservation check, and the exact exemption email.
- [ ] Seed one default English template idempotently.

### Task 3: Campaign data access and server actions

**Files:**
- Create: `src/lib/adminEmailCampaigns.ts`
- Create: `src/app/admin/email-template/actions.ts`
- Create: `src/components/ConfirmEmailSendButton.tsx`

- [ ] Add service-role queries for customers, templates with products, active products, recent logs, and last successful sends.
- [ ] Add create/update/deactivate actions with validation and a 1-6 product limit.
- [ ] Add a send action that revalidates customer/template state, reserves the send, sends through Resend, and marks the log success or failure.
- [ ] Add a client submit button that displays the recipient and template name in a second confirmation and exposes pending state.

### Task 4: Replace the admin email page

**Files:**
- Modify: `src/app/admin/email-template/page.tsx`

- [ ] Remove private order-link generation and copy-only template blocks from this page.
- [ ] Add Send, Templates, and History navigation while preserving admin password propagation.
- [ ] Add customer/template selectors, automatic country match, manual override, eligibility/cooldown explanation, and email preview.
- [ ] Add template create/edit/deactivate forms and ordered product selection.
- [ ] Add a recent history table with delivery details and expandable snapshots.
- [ ] Show a clear migration instruction when the new tables are unavailable.

### Task 5: Verification and documentation

**Files:**
- Modify: `README.md`

- [ ] Document running `supabase/email_campaign_templates.sql` and the required existing Resend/site environment variables.
- [ ] Run the focused Node tests.
- [ ] Run ESLint on changed TypeScript files.
- [ ] Run `npm run build`.
- [ ] Open the local admin page and verify send, templates, history, preview, disabled states, and responsive layout.

