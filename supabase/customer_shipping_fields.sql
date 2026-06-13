alter table customers
  add column if not exists shipping_recipient_name text,
  add column if not exists shipping_phone text,
  add column if not exists shipping_country text,
  add column if not exists shipping_address text,
  add column if not exists shipping_note text;

grant select, update on customers to service_role;

