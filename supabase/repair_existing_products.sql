create extension if not exists "pgcrypto";

alter table products add column if not exists slug text;
alter table products add column if not exists category text;
alter table products add column if not exists description text;
alter table products add column if not exists image_url text;
alter table products add column if not exists material text;
alter table products add column if not exists color text;
alter table products add column if not exists status text default 'active';
alter table products add column if not exists created_at timestamptz default now();
alter table products add column if not exists updated_at timestamptz default now();

update products
set slug = lower(regexp_replace(coalesce(name, id::text), '[^a-zA-Z0-9]+', '-', 'g'))
where slug is null or slug = '';

create unique index if not exists products_slug_unique on products(slug);

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

insert into products (name, slug, category, description, image_url, material, color, status)
values
  ('AF1 Replacement Sole White', 'af1-replacement-sole-white', 'Sneaker Soles', 'White replacement sole for AF1-style sneaker repair.', '/products/af1-replacement-sole-white.png', 'Rubber', 'White', 'active'),
  ('Rubber Sheet Black', 'rubber-sheet-black', 'Rubber Sheets', 'Black rubber sheet for outsole patching and shoe repair cutting.', '/products/rubber-sheet-black.png', 'Rubber', 'Black', 'active'),
  ('Heel Rubber', 'heel-rubber', 'Heel Materials', 'Durable heel rubber material for shoe heel replacement.', '/products/heel-rubber.png', 'Rubber', 'Black', 'active'),
  ('Shoe Repair Glue', 'shoe-repair-glue', 'Adhesives & Chemicals', 'Strong adhesive for bonding soles, heels, and repair patches.', '/products/shoe-repair-glue.png', 'Adhesive', 'Clear', 'active'),
  ('Insole Material', 'insole-material', 'Insole Materials', 'Sheet material for custom shoe insole repair and replacement.', '/products/insole-material.png', 'EVA', 'Beige', 'active')
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  image_url = excluded.image_url,
  material = excluded.material,
  color = excluded.color,
  status = excluded.status,
  updated_at = now();

insert into product_variants (product_id, sku, size, color, unit, price, stock_status)
values
  ((select id from products where slug = 'af1-replacement-sole-white'), 'AF1-SOLE-WHT-40', '40', 'White', 'pair', 9.80, 'in_stock'),
  ((select id from products where slug = 'af1-replacement-sole-white'), 'AF1-SOLE-WHT-41', '41', 'White', 'pair', 9.80, 'in_stock'),
  ((select id from products where slug = 'af1-replacement-sole-white'), 'AF1-SOLE-WHT-42', '42', 'White', 'pair', 9.80, 'in_stock'),
  ((select id from products where slug = 'af1-replacement-sole-white'), 'AF1-SOLE-WHT-43', '43', 'White', 'pair', 9.80, 'in_stock'),
  ((select id from products where slug = 'af1-replacement-sole-white'), 'AF1-SOLE-WHT-44', '44', 'White', 'pair', 9.80, 'in_stock'),
  ((select id from products where slug = 'rubber-sheet-black'), 'RUB-SHEET-BLK-3MM', '3mm', 'Black', 'sheet', 6.50, 'in_stock'),
  ((select id from products where slug = 'heel-rubber'), 'HEEL-RUB-BLK-STD', 'Standard', 'Black', 'pair', 4.20, 'in_stock'),
  ((select id from products where slug = 'shoe-repair-glue'), 'GLUE-REPAIR-500ML', '500ml', 'Clear', 'bottle', 3.90, 'in_stock'),
  ((select id from products where slug = 'insole-material'), 'INSOLE-EVA-BGE-SHEET', 'Sheet', 'Beige', 'sheet', 5.60, 'in_stock')
on conflict (sku) do update set
  product_id = excluded.product_id,
  size = excluded.size,
  color = excluded.color,
  unit = excluded.unit,
  price = excluded.price,
  stock_status = excluded.stock_status,
  updated_at = now();

grant usage on schema public to anon, authenticated, service_role;
grant select on products to anon, authenticated, service_role;
grant select on product_variants to anon, authenticated, service_role;
