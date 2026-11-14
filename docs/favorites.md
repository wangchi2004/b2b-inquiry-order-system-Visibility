# Account favorites

Favorites are stored in `public.customer_favorites` and keyed by auth user and
product. Migration `20261114160053_customer_favorites.sql` was applied to
`shoe-repair-b2b`. RLS restricts select/insert/delete to the owner; the website
API validates the confirmed account and scopes every query to that user.

Entry points: product card hearts, detail-page favorite button, and
`/{locale}/account` → `/{locale}/favorites`. Guest clicks lead to sign-in.
The list includes empty/loading/error states and a retry action. Inactive
products cannot be newly saved and appear as unavailable in an existing list,
where they can still be removed. Deleting a product cascades its favorites.

Writes are idempotent; UI updates only after success and blocks repeated clicks
while saving. Tabs sync through a change signal, and returning to a window
reloads account favorites. No product lists or credentials are stored locally.
The favorites API is included in session renewal so expired access credentials
can be renewed from a remembered login. The website code still needs deployment.

Validation: local SQL tests verify ownership, duplicate saves, deletion, anonymous
access and cascades; API tests verify authentication, CSRF, account isolation,
invalid/unavailable products, and repeat operations.
