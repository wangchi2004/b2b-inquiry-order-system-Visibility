# Sample catalog access

The account page now accepts existing confirmed Supabase email/password accounts.
Inquiry contact details and browser local storage do not grant catalog access.
Access and refresh credentials are stored in HttpOnly, same-site cookies.
The refresh cookie persists for 90 days and is renewed when an expired access
credential is refreshed on the next visit. The proxy forwards rotated credentials
to both the current server render/download and the browser.
Logout clears both cookies and attempts to revoke the current provider session.
Clearing browser data, provider revocation, or 90 days without renewal requires
signing in again. Existing logins created before this change need one new login
to receive a refresh cookie. Passwords are never stored in browser storage.

## Release together

1. Deploy the website changes, including the authenticated file download endpoint.
2. Apply `supabase/sample_files_storage.sql` to the website's Supabase project.
   The existing `sample-files` bucket must be private. Until this is applied,
   previously shared public storage URLs remain accessible outside the website.
3. Do not place sample files in `public/catalog-files` or `public/downloads`.
4. Verify a confirmed existing customer can sign in and download, sign out and
   verify `/en/catalog`, `/sample-catalog`, `/downloads/sample-catalog.pdf`, and
   `/api/catalog-files/<filename>` reject or redirect unauthenticated requests.
5. Verify an old `/storage/v1/object/public/sample-files/<filename>` URL no
   longer returns the file (including any previously cached copies).

The `/samples` product gallery now requires the same website account login. The mobile app uses a separate session.

## Password recovery

The account page includes a reset-email form, and `/{locale}/reset-password`
accepts the recovery session from the email link before allowing a password update.
Add these exact URLs to Supabase Authentication → URL Configuration → Redirect URLs:

- https://www.wangchi2004.com/en/reset-password
- https://www.wangchi2004.com/zh/reset-password
- https://www.wangchi2004.com/ja/reset-password
- https://www.wangchi2004.com/ko/reset-password

Also allow the corresponding localhost URLs for development. Reset emails must
use the provider's recovery ConfirmationURL. Verify delivery and link handling
with a test customer after deployment. No reset email is sent during code checks.
Password recovery requires an existing customer auth account; inquiry contact
records and administrator passwords are not customer auth accounts.


## Header and registration

The shared storefront header renders guest registration/sign-in buttons or the
verified current account email. Account links lead to the personal center.
Registration is at `/{locale}/register`; existing signed-in users are redirected
to their account. New customers confirm their email before signing in. Add the
four `https://www.wangchi2004.com/{locale}/account` URLs to the auth redirect
allowlist, and enable email signups and confirmation in the auth provider.
The register API uses the public auth client, never privileged account creation.


## Unified inquiry login

All legacy inquiry entrances use the same verified website session as the header.
`/order/{token}`, `/{locale}/order/{token}`, `/samples`, and cart pages require
login on the server. Guests are redirected to the personal center with an
internal return destination. A saved visitor email/country is only contact data
and never grants access. The original homepage entrance remains available; it
shows the current account and offers entry instead of a separate email login.

Private order links require the signed-in email to match the linked customer;
a different account is sent to general inquiry without exposing customer data.
Order submission and image upload require the same account cookie. Checkout
shows a read-only account email, and the server overrides submitted emails with
the verified account email. Private-link customer updates are also scoped to
that email. Contact country, company and shipping information remain checkout
fields, not login credentials.
