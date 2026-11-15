# Cross-device website account sync

Signed-in carts use `customer_carts`, with a service-only transactional RPC and
operation ID deduplication. Cart contents store variant IDs and quantities only;
the authenticated API supplies canonical current product metadata and prices.
Anonymous clients cannot read carts. Requests bind to the current account and
include the browser's expected user ID to prevent cross-account writes.

Active pages poll cart and favorites every 5 seconds, with focus/online recovery.
Address, order and account views refresh every 15 seconds while not editing a
field. Cart focus refresh updates server-provided address data without resetting
an unchanged address/contact draft. Network failures show a retry message.

Cart additions and plus/minus controls are atomic increments/decrements. Absolute
quantity edits commit on blur/Enter and require the quantity the user reviewed;
conflicts reload the latest cart instead of overwriting a different device.
Pending changes block checkout. Order submission consumes only purchased units,
using the order ID as an idempotency key, retaining additions from another device.

Legacy unscoped device carts remain available through an explicit import button.
Import operations are deduplicated. They are never silently assigned to an account.
Logout clears visible account state and does not delete the server cart.

Scope: phone and desktop browsers on this website. The separate mobile app has
its own cart store and is not rewired by this website change. Recently viewed
products and unsent form drafts remain device-local. No passwords are synced.

Migration `20261115074944_account_cart_sync.sql` is applied to the connected
project. Website code still requires deployment. Tests use isolated phone/PC
client runtimes and a local Postgres-compatible database; they do not modify
real customer cart/order rows.
