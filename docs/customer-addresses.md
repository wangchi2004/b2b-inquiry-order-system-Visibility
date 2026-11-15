# Customer address book

`/{locale}/addresses` supports up to 20 addresses per verified website account,
including editing, confirmed deletion and setting the default. It is linked from
the account page. Interface labels support English, Chinese, Japanese and Korean.

Migration `20261115073609_customer_address_book.sql` was applied to the connected
project. Rows are protected by owner RLS; writes use a service-only transactional
RPC called by authenticated server actions. The RPC serializes per-account
changes, rejects foreign address IDs, enforces one default, and picks a remaining
address after deleting the default. No customer records were changed during tests.

Checkout preloads the default address and lets customers manage it from the cart.
Submission sends only the address ID; the server re-reads it within the current
account and copies its values into existing order shipping fields. A deleted or
foreign ID is rejected, never replaced with another account's address. Existing
orders are unchanged by later address-book edits. Where no address book entry
exists, the previous customer shipping fallback is retained for legacy inquiries.

The mobile app's separate profile fields are not overwritten by this feature.
