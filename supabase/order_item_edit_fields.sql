-- Add editable order item pricing for admin order detail pages.
-- This stores the quoted unit price on each order line, so editing an order
-- does not change the product catalog price.

alter table order_items
  add column if not exists unit_price numeric(12, 2);

grant select, insert, update, delete on order_items to service_role;
