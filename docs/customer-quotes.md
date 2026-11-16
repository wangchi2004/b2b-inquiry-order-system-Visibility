# Customer quotes and the original order editor

The account's My Quotes link opens `/{locale}/quotes`. Access requires the
same signed-in account as My Orders. Queries restrict results to that account
or its verified legacy email before pagination.

An order appears only after an administrator saves its complete quote, verifies
stock, product prices and shipping, and publishes it with the unpaid confirmation
checkbox. The product subtotal must match the item lines and the total must equal
the product subtotal plus shipping. Existing orders begin with an unknown payment
state and require explicit verification; they are not assumed unpaid.

After funds actually arrive, the administrator uses Confirm received payment.
The operation records the receipt time and removes the order from My Quotes;
the order remains in My Orders. This is manual payment recording, not a payment
gateway. Payment and quote publication changes have an audit trail.

Editing item specifications, quantities, prices or quote amounts clears publication
so stock and shipping must be confirmed again. Publication and receipt actions
reject stale quote versions. Paid orders block financial/item edits.

The administrator's Product Details section uses the original table for both
account and legacy orders: image, product, SKU, size, color, quantity, unit, price
and subtotal. Shipping details, PayPal calculations, save and reply-email controls
remain below it. Paid or fulfillment-stage orders show this layout read-only.

Database migrations: `20261115143204_unpaid_customer_quotes.sql` and
`20261115145130_protect_confirmed_payments.sql`. Tests use an isolated local
database and server rendering; no customer order is changed during testing.
