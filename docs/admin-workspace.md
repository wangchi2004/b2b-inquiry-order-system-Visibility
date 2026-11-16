# Private administrator workspace

The bookmarkable entry is `/admin`. There is no link from the storefront or
customer account. The workspace lists order, manual order, product, category,
customer, email and visitor tools. Order/customer details are reached from their
lists.

Customer authentication does not grant administrator access. Enter the existing
ADMIN_PASSWORD into the workspace password form. A signed, HttpOnly, SameSite
Strict cookie lasts eight hours (Secure in production). Workspace links carry no
password. Existing administrator pages, actions and upload/export endpoints now
also verify this cookie. The existing password access remains compatible.

Logout clears this browser's administrator cookie. Changing ADMIN_PASSWORD
invalidates all workspace sessions. Admin pages carry noindex/nofollow,
no-referrer and private no-store headers. These headers supplement the server
access checks; they do not replace authentication.
