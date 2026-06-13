create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  country text,
  whatsapp text,
  company text,
  shipping_recipient_name text,
  shipping_phone text,
  shipping_country text,
  shipping_address text,
  shipping_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_links (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  token text not null unique,
  status text not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  customer_email text not null,
  country text,
  whatsapp text,
  note text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  variant_id uuid references product_variants(id) on delete set null,
  product_name text not null,
  sku text,
  size text,
  color text,
  quantity integer not null check (quantity > 0),
  unit text,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_links_customer_id
  on order_links(customer_id);

create index if not exists idx_orders_customer_id
  on orders(customer_id);

create index if not exists idx_orders_customer_email
  on orders(customer_email);

create index if not exists idx_order_items_order_id
  on order_items(order_id);

drop trigger if exists set_customers_updated_at on customers;
create trigger set_customers_updated_at
before update on customers
for each row execute function set_updated_at();

drop trigger if exists set_orders_updated_at on orders;
create trigger set_orders_updated_at
before update on orders
for each row execute function set_updated_at();

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on customers to service_role;
grant select, insert, update on order_links to service_role;
grant select, insert, update, delete on orders to service_role;
grant select, insert on order_items to service_role;
