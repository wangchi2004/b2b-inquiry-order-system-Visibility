# Customer order portal

Routes: `/{locale}/orders` (10 orders per page) and `/{locale}/orders/{id}`.
Both require the verified account used in the header. Queries select explicit
customer-safe fields and restrict ownership to `mobile_user_id`, or the verified
email only for legacy orders without an account ID. Bound orders belonging to a
different account are excluded even if their contact email matches.

New website inquiries also store the account ID in `mobile_user_id`, reusing the
existing account order workflow without a database migration. Quotes and totals
use existing USD quote fields. Missing amounts are never shown as zero. Customers
can confirm a published quote only while its timestamp and quoted status still
match, and shipping and total are present. Confirming is not payment.

Admin: account orders use the existing publish/prepare/ship/complete workflow;
legacy orders have a status/carrier/tracking form beside the existing quote form.
Tracking is the entered carrier and consignment number, not live carrier scans.
Customer-visible status is current progress, not a historical event timeline.

The source supports English, Chinese, Japanese and Korean; dates are explicitly
labelled UTC. No live customer orders are created or modified by tests.
