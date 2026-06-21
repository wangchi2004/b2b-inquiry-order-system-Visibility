# Country Email Campaigns Design

## Goal

Replace the private-order-link email generator with a small, auditable campaign tool for one-to-one customer outreach. An administrator selects a customer, receives the best active country template automatically, previews a generated email containing a normal website link and 1-6 featured products, confirms the recipient, and sends through Resend.

## Rules

- Templates are matched by normalized country aliases and fall back to one active English default template.
- Administrators may create and edit templates, choose 1-6 active products, and deactivate templates. Used templates are never hard-deleted.
- The email contains a greeting, body, ordinary website button, product name/main image, closing, and signature. It contains no order token, price, or customer-email autofill URL.
- Sending requires a valid customer email and is blocked for invalid, unsubscribed, or do-not-contact customers.
- A successful send blocks another send to the same normalized email for 15 days. `wangchi.2004@gmail.com` is exempt.
- A short-lived `sending` reservation prevents double-click and concurrent sends. Failed sends do not start the 15-day cooldown.
- Every attempt stores the rendered subject, HTML/text snapshots, template/customer, recipient, country, provider ID, status, error, and timestamps.
- The send button requires a browser confirmation showing the recipient and template name.

## Data Model

### `email_templates`

Stores template name, country aliases, locale, subject, greeting, body, website button label, closing, signature, default flag, and active/inactive status.

### `email_template_products`

Joins templates to products with an explicit display order and a maximum of six products enforced by the application and database trigger.

### `email_send_logs`

Stores each reserved send and its immutable rendered content. The `reserve_email_campaign_send` database function uses an advisory lock to enforce the cooldown atomically.

## Admin Page

`/admin/email-template?password=...` has three views:

1. **Send Email**: customer selection, automatic template match with manual override, eligibility/cooldown status, rendered preview, and confirmed send.
2. **Templates**: create/edit/deactivate country templates and select featured products.
3. **History**: inspect recent success/failure records and message snapshots.

If the migration has not been run, the page remains usable enough to explain which SQL file must be executed.

## Security

- All database operations use the server-only service-role client.
- The Resend API key never enters client components.
- User-configured copy is HTML-escaped before rendering.
- Admin password validation remains server-side.
- The atomic database reservation is the source of truth for cooldown and concurrency.

