create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text,
  description text,
  image_url text,
  image_url_2 text,
  image_url_3 text,
  material text,
  color text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text not null unique,
  size text,
  color text,
  unit text not null default 'piece',
  price numeric(12, 2),
  stock_status text not null default 'in_stock',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_translations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  locale text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, locale)
);

create table if not exists category_translations (
  id uuid primary key default gen_random_uuid(),
  category_id text not null,
  locale text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, locale)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  country text,
  whatsapp text,
  company text,
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
  locale text not null default 'en',
  inquiry_image_url_1 text,
  inquiry_image_url_2 text,
  inquiry_image_url_3 text,
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

create index if not exists idx_product_variants_product_id
  on product_variants(product_id);

create index if not exists idx_product_translations_product_locale
  on product_translations(product_id, locale);

create index if not exists idx_category_translations_category_locale
  on category_translations(category_id, locale);

create index if not exists idx_order_links_customer_id
  on order_links(customer_id);

create index if not exists idx_orders_customer_id
  on orders(customer_id);

create index if not exists idx_order_items_order_id
  on order_items(order_id);

drop trigger if exists set_products_updated_at on products;
create trigger set_products_updated_at
before update on products
for each row execute function set_updated_at();

drop trigger if exists set_product_variants_updated_at on product_variants;
create trigger set_product_variants_updated_at
before update on product_variants
for each row execute function set_updated_at();

drop trigger if exists set_product_translations_updated_at on product_translations;
create trigger set_product_translations_updated_at
before update on product_translations
for each row execute function set_updated_at();

drop trigger if exists set_category_translations_updated_at on category_translations;
create trigger set_category_translations_updated_at
before update on category_translations
for each row execute function set_updated_at();

drop trigger if exists set_customers_updated_at on customers;
create trigger set_customers_updated_at
before update on customers
for each row execute function set_updated_at();

drop trigger if exists set_orders_updated_at on orders;
create trigger set_orders_updated_at
before update on orders
for each row execute function set_updated_at();

grant usage on schema public to anon, authenticated, service_role;

grant select on products to anon, authenticated, service_role;
grant select on product_variants to anon, authenticated, service_role;
grant select on product_translations to anon, authenticated, service_role;
grant select on category_translations to anon, authenticated, service_role;
