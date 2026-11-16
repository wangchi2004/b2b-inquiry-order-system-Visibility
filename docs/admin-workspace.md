# Private administrator workspace

Bookmark `/admin?password=YOUR_ADMIN_PASSWORD` using the deployed ADMIN_PASSWORD
value, URL-encoded. There is no login form and no storefront/customer account link.
Missing or incorrect credentials return a not-found response without management
links. Customer login alone does not grant workspace access.

Workspace links forward the password to the existing protected administrator
pages. These pages also retain compatibility with previously issued administrator
cookies until expiration. The workspace no longer issues login cookies.

Anyone holding the complete bookmark has administrator access. Changing the
server's ADMIN_PASSWORD invalidates old bookmarks and administrator cookies.
Admin pages use noindex/nofollow, no-referrer and private no-store headers.
