-- Add admin quote fields for order detail pages.
-- These fields store the manually entered shipping fee and the calculated PayPal amounts.

alter table orders
  add column if not exists product_subtotal numeric(12, 2),
  add column if not exists shipping_fee numeric(12, 2),
  add column if not exists grand_total numeric(12, 2),
  add column if not exists paypal_fee numeric(12, 2),
  add column if not exists paypal_collection numeric(12, 2),
  add column if not exists paypal_fee_rate numeric(5, 4) not null default 0.05,
  add column if not exists shipping_recipient_name text,
  add column if not exists shipping_phone text,
  add column if not exists shipping_country text,
  add column if not exists shipping_address text,
  add column if not exists shipping_note text,
  add column if not exists quote_updated_at timestamptz;

grant select, update on orders to service_role;
