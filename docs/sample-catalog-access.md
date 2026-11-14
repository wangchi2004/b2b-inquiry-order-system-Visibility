# Sample catalog access

The account page now accepts existing confirmed Supabase email/password accounts.
Inquiry contact details and browser local storage do not grant catalog access.
Sessions are stored in an HttpOnly, same-site cookie and expire with the access token;
after expiry the customer must sign in again.

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

The public `/samples` product image gallery remains available. Customer registration,
password recovery, and the mobile app's separate session are outside this change.
