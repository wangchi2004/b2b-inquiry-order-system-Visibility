# Optional Customer Email Design

## Goal

Allow an administrator to create a CRM customer without an email address while preserving email validation and duplicate prevention whenever an email is supplied.

## Behavior

- `customers.email` becomes nullable.
- The new-customer form no longer marks email as required.
- When email is present, it is trimmed, lowercased, validated, and checked case-insensitively for duplicates.
- When email is absent, duplicate email lookup is skipped.
- A customer without email must provide at least a name or company.
- Customers without email are stored with SQL `NULL`, not an empty string or generated placeholder.
- `email_valid` is false when no email is supplied.
- Successful creation continues to redirect to the customer detail page.

## Database Migration

Add an idempotent SQL migration that drops the `NOT NULL` constraint from `customers.email`. The existing unique constraint remains: PostgreSQL permits multiple `NULL` values in a unique column while still preventing duplicate non-null emails.

## Application Changes

- Extend the customer creation helper with validation for optional-email records.
- Update the server action to conditionally validate and query email.
- Update the form label and browser-required state.
- Keep existing behavior for customers that do provide email.

## Error Handling

- Invalid non-empty email: return to the form with a clear message.
- Empty email plus empty name and company: return to the form with a clear message.
- Database migration not yet applied: surface the Supabase insert error so the administrator knows the schema must be updated.

## Testing

- Empty email is accepted by optional-email validation.
- Invalid non-empty email is rejected.
- Empty email requires name or company.
- Existing normalization and complete-email validation continue to pass.
- Run the focused tests, ESLint, and production build.

