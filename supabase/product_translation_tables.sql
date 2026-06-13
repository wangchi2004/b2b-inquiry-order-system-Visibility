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

create index if not exists idx_product_translations_product_locale
  on product_translations(product_id, locale);

create index if not exists idx_category_translations_category_locale
  on category_translations(category_id, locale);

drop trigger if exists set_product_translations_updated_at on product_translations;
create trigger set_product_translations_updated_at
before update on product_translations
for each row execute function set_updated_at();

drop trigger if exists set_category_translations_updated_at on category_translations;
create trigger set_category_translations_updated_at
before update on category_translations
for each row execute function set_updated_at();

insert into product_translations (product_id, locale, name, description)
select
  id,
  'en',
  name,
  description
from products
on conflict (product_id, locale) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

insert into category_translations (category_id, locale, name)
select distinct
  category,
  'en',
  category
from products
where category is not null and trim(category) <> ''
on conflict (category_id, locale) do update
set
  name = excluded.name,
  updated_at = now();

insert into category_translations (category_id, locale, name)
values
  ('Replacement Soles', 'en', 'Replacement Soles'),
  ('Sneaker Soles', 'en', 'Sneaker Soles'),
  ('Leather Shoe Soles', 'en', 'Leather Shoe Soles'),
  ('Sole Accessories', 'en', 'Sole Accessories'),
  ('Rubber Sheets', 'en', 'Rubber Sheets'),
  ('Insole Materials', 'en', 'Insole Materials'),
  ('Heel Materials', 'en', 'Heel Materials'),
  ('Adhesives & Chemicals', 'en', 'Adhesives & Chemicals'),
  ('Contact Cement', 'en', 'Contact Cement'),
  ('Resin Adhesive', 'en', 'Resin Adhesive'),
  ('Hardener', 'en', 'Hardener'),
  ('Leather & Linings', 'en', 'Leather & Linings'),
  ('Shoe Repair Accessories', 'en', 'Shoe Repair Accessories'),
  ('Shoe Repair Mesh Fabric', 'en', 'Shoe Repair Mesh Fabric'),
  ('Heel Fish-Eye Mesh', 'en', 'Heel Fish-Eye Mesh'),
  ('Heel Plain Mesh', 'en', 'Heel Plain Mesh'),
  ('Upper Mesh Fabric', 'en', 'Upper Mesh Fabric'),
  ('Shoe Care Products', 'en', 'Shoe Care Products'),
  ('Zipper Puller Hardware Accessories', 'en', 'Zipper Puller Hardware Accessories'),
  ('Plastic Accessories', 'en', 'Plastic Accessories'),
  ('Zipper Puller Hardware Accessories', 'zh', '拉头五金配件'),
  ('Plastic Accessories', 'zh', '塑料配件'),
  ('Zipper Puller Hardware Accessories', 'ko', '지퍼 풀러 금속 부자재'),
  ('Plastic Accessories', 'ko', '플라스틱 부자재'),
  ('Zipper Puller Hardware Accessories', 'ja', 'ジッパープラー金具部品'),
  ('Plastic Accessories', 'ja', 'プラスチック部品'),
  ('Tools & Equipment', 'en', 'Tools & Equipment')
on conflict (category_id, locale) do update
set
  name = excluded.name,
  updated_at = now();

grant select on product_translations to anon, authenticated, service_role;
grant select on category_translations to anon, authenticated, service_role;
grant insert, update, delete on product_translations to service_role;
grant insert, update, delete on category_translations to service_role;
