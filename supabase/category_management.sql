-- Database-backed product category management.
-- Safe to run more than once.

alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete restrict,
  add column if not exists sort_order integer not null default 0,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

alter table public.categories
  drop constraint if exists categories_status_check;
alter table public.categories
  add constraint categories_status_check check (status in ('active', 'inactive'));

with ranked_categories as (
  select
    id,
    first_value(id) over (
      partition by name
      order by case when slug not like '%-test' then 0 else 1 end, created_at, id
    ) as keeper_id,
    row_number() over (
      partition by name
      order by case when slug not like '%-test' then 0 else 1 end, created_at, id
    ) as duplicate_rank
  from public.categories
), reassigned_products as (
  update public.products product
  set category_id = ranked.keeper_id
  from ranked_categories ranked
  where ranked.duplicate_rank > 1
    and product.category_id = ranked.id
  returning product.id
)
delete from public.categories category
using ranked_categories ranked
where ranked.duplicate_rank > 1
  and category.id = ranked.id;

create unique index if not exists categories_name_unique
  on public.categories (name);
create index if not exists categories_parent_sort_idx
  on public.categories (parent_id, sort_order, name);

alter table public.products
  add column if not exists category_id uuid references public.categories(id) on delete restrict;

create index if not exists products_category_id_idx
  on public.products (category_id);

create temporary table category_seed (
  name text primary key,
  slug text not null unique,
  parent_name text,
  sort_order integer not null
) on commit drop;

insert into category_seed (name, slug, parent_name, sort_order)
values
    ('Replacement Soles', 'replacement-soles', null, 10),
    ('Sneaker Soles', 'sneaker-soles', 'Replacement Soles', 10),
    ('Leather Shoe Soles', 'leather-shoe-soles', 'Replacement Soles', 20),
    ('Sole Accessories', 'sole-accessories', 'Replacement Soles', 30),
    ('Rubber Sheets', 'rubber-sheets', null, 20),
    ('Insole Materials', 'insole-materials', null, 30),
    ('Heel Materials', 'heel-materials', null, 40),
    ('Adhesives & Chemicals', 'adhesives-chemicals', null, 50),
    ('Contact Cement', 'contact-cement', 'Adhesives & Chemicals', 10),
    ('Resin Adhesive', 'resin-adhesive', 'Adhesives & Chemicals', 20),
    ('Hardener', 'hardener', 'Adhesives & Chemicals', 30),
    ('Leather & Linings', 'leather-linings', null, 60),
    ('Shoe Repair Accessories', 'shoe-repair-accessories', null, 70),
    ('Shoe Repair Mesh Fabric', 'shoe-repair-mesh-fabric', 'Shoe Repair Accessories', 10),
    ('Heel Fish-Eye Mesh', 'heel-fish-eye-mesh', 'Shoe Repair Mesh Fabric', 10),
    ('Heel Round-Eye Mesh', 'heel-round-eye-mesh', 'Shoe Repair Mesh Fabric', 20),
    ('Heel Plain Mesh', 'heel-plain-mesh', 'Shoe Repair Mesh Fabric', 30),
    ('Satin Nike Heel Fabric', 'satin-nike-heel-fabric', 'Shoe Repair Mesh Fabric', 40),
    ('Upper Mesh Fabric', 'upper-mesh-fabric', 'Shoe Repair Mesh Fabric', 50),
    ('Diamond Lattice', 'diamond-lattice', 'Upper Mesh Fabric', 10),
    ('Terry Cloth Fabric', 'terry-cloth-fabric', 'Shoe Repair Mesh Fabric', 60),
    ('Shoe Care Products', 'shoe-care-products', null, 80),
    ('Zipper Puller Hardware Accessories', 'zipper-puller-hardware-accessories', null, 90),
    ('Plastic Accessories', 'plastic-accessories', null, 100),
    ('Tools & Equipment', 'tools-equipment', null, 110);

insert into public.categories (name, slug, parent_id, sort_order)
select name, slug, null, sort_order
from category_seed
where parent_name is null
on conflict (slug) do update
set name = excluded.name,
    parent_id = null,
    sort_order = excluded.sort_order;

insert into public.categories (name, slug, parent_id, sort_order)
select seed.name, seed.slug, parent.id, seed.sort_order
from category_seed seed
join public.categories parent on parent.name = seed.parent_name
where seed.parent_name is not null
  and seed.parent_name in ('Replacement Soles', 'Adhesives & Chemicals', 'Shoe Repair Accessories')
on conflict (slug) do update
set name = excluded.name,
    parent_id = excluded.parent_id,
    sort_order = excluded.sort_order;

insert into public.categories (name, slug, parent_id, sort_order)
select seed.name, seed.slug, parent.id, seed.sort_order
from category_seed seed
join public.categories parent on parent.name = seed.parent_name
where seed.parent_name = 'Shoe Repair Mesh Fabric'
on conflict (slug) do update
set name = excluded.name,
    parent_id = excluded.parent_id,
    sort_order = excluded.sort_order;

insert into public.categories (name, slug, parent_id, sort_order)
select 'Diamond Lattice', 'diamond-lattice', parent.id, 10
from public.categories parent
where parent.name = 'Upper Mesh Fabric'
on conflict (slug) do update
set name = excluded.name,
    parent_id = excluded.parent_id,
    sort_order = excluded.sort_order;

update public.categories
set status = 'inactive'
where name in (
  'Heel Counter Fabric',
  'Insoles',
  'Leather Chemicals',
  'Leather Materials',
  'Shoe Repair Glue'
)
and not exists (
  select 1 from public.products where products.category_id = categories.id
);

update public.products product
set category_id = category.id
from public.categories category
where product.category_id is null
  and category.name = product.category;

with translation_values(category_name, locale, translated_name) as (
  values
    ('Replacement Soles','en','Replacement Soles'),('Replacement Soles','zh','替换鞋底'),('Replacement Soles','ko','교체용 밑창'),('Replacement Soles','ja','交換用ソール'),
    ('Sneaker Soles','en','Sneaker Soles'),('Sneaker Soles','zh','运动鞋鞋底'),('Sneaker Soles','ko','스니커즈 밑창'),('Sneaker Soles','ja','スニーカーソール'),
    ('Leather Shoe Soles','en','Leather Shoe Soles'),('Leather Shoe Soles','zh','皮鞋鞋底'),('Leather Shoe Soles','ko','가죽 구두 밑창'),('Leather Shoe Soles','ja','革靴用ソール'),
    ('Sole Accessories','en','Sole Accessories'),('Sole Accessories','zh','鞋底配件'),('Sole Accessories','ko','밑창 부자재'),('Sole Accessories','ja','ソール付属品'),
    ('Rubber Sheets','en','Rubber Sheets'),('Rubber Sheets','zh','橡胶片'),('Rubber Sheets','ko','고무 시트'),('Rubber Sheets','ja','ゴムシート'),
    ('Insole Materials','en','Insole Materials'),('Insole Materials','zh','鞋垫材料'),('Insole Materials','ko','깔창 재료'),('Insole Materials','ja','インソール材料'),
    ('Heel Materials','en','Heel Materials'),('Heel Materials','zh','后跟材料'),('Heel Materials','ko','뒤꿈치 재료'),('Heel Materials','ja','ヒール材料'),
    ('Adhesives & Chemicals','en','Adhesives & Chemicals'),('Adhesives & Chemicals','zh','胶水与化学材料'),('Adhesives & Chemicals','ko','접착제 및 화학 제품'),('Adhesives & Chemicals','ja','接着剤・化学製品'),
    ('Contact Cement','en','Contact Cement'),('Contact Cement','zh','万能胶'),('Contact Cement','ko','컨택트 접착제'),('Contact Cement','ja','コンタクトセメント'),
    ('Resin Adhesive','en','Resin Adhesive'),('Resin Adhesive','zh','树脂胶'),('Resin Adhesive','ko','레진 접착제'),('Resin Adhesive','ja','樹脂接着剤'),
    ('Hardener','en','Hardener'),('Hardener','zh','固化剂'),('Hardener','ko','경화제'),('Hardener','ja','硬化剤'),
    ('Leather & Linings','en','Leather & Linings'),('Leather & Linings','zh','皮革与里布'),('Leather & Linings','ko','가죽 및 안감'),('Leather & Linings','ja','革・ライニング'),
    ('Shoe Repair Accessories','en','Shoe Repair Accessories'),('Shoe Repair Accessories','zh','修鞋配件'),('Shoe Repair Accessories','ko','신발 수선 부자재'),('Shoe Repair Accessories','ja','靴修理アクセサリー'),
    ('Shoe Repair Mesh Fabric','en','Shoe Repair Mesh Fabric'),('Shoe Repair Mesh Fabric','zh','修鞋网布'),('Shoe Repair Mesh Fabric','ko','신발 수선 메쉬 원단'),('Shoe Repair Mesh Fabric','ja','靴修理用メッシュ生地'),
    ('Heel Fish-Eye Mesh','en','Heel Fish-Eye Mesh'),('Heel Fish-Eye Mesh','zh','后跟鱼眼网布'),('Heel Fish-Eye Mesh','ko','뒤꿈치 피쉬아이 메쉬'),('Heel Fish-Eye Mesh','ja','ヒール用フィッシュアイメッシュ'),
    ('Heel Round-Eye Mesh','en','Heel Round-Eye Mesh'),('Heel Round-Eye Mesh','zh','圆眼后跟网布'),('Heel Round-Eye Mesh','ko','뒤꿈치 라운드 아이 메쉬'),('Heel Round-Eye Mesh','ja','ヒール用丸目メッシュ'),
    ('Heel Plain Mesh','en','Heel Plain Mesh'),('Heel Plain Mesh','zh','后跟普通网布'),('Heel Plain Mesh','ko','뒤꿈치 일반 메쉬'),('Heel Plain Mesh','ja','ヒール用プレーンメッシュ'),
    ('Satin Nike Heel Fabric','en','Satin Nike Heel Fabric'),('Satin Nike Heel Fabric','zh','缎面 Nike 后跟布'),('Satin Nike Heel Fabric','ko','새틴 나이키 뒤꿈치 원단'),('Satin Nike Heel Fabric','ja','サテンNikeヒール生地'),
    ('Upper Mesh Fabric','en','Upper Mesh Fabric'),('Upper Mesh Fabric','zh','鞋面网布'),('Upper Mesh Fabric','ko','갑피 메쉬 원단'),('Upper Mesh Fabric','ja','アッパーメッシュ生地'),
    ('Diamond Lattice','en','Diamond Lattice'),('Diamond Lattice','zh','菱形格网布'),('Diamond Lattice','ko','다이아몬드 격자 메쉬'),('Diamond Lattice','ja','ダイヤ格子メッシュ'),
    ('Terry Cloth Fabric','en','Terry Cloth Fabric'),('Terry Cloth Fabric','zh','毛巾布面料'),('Terry Cloth Fabric','ko','테리직 원단'),('Terry Cloth Fabric','ja','テリークロス生地'),
    ('Shoe Care Products','en','Shoe Care Products'),('Shoe Care Products','zh','鞋护理产品'),('Shoe Care Products','ko','신발 관리 제품'),('Shoe Care Products','ja','靴ケア用品'),
    ('Zipper Puller Hardware Accessories','en','Zipper Puller Hardware Accessories'),('Zipper Puller Hardware Accessories','zh','拉头五金配件'),('Zipper Puller Hardware Accessories','ko','지퍼 풀러 금속 부자재'),('Zipper Puller Hardware Accessories','ja','ジッパープラー金具部品'),
    ('Plastic Accessories','en','Plastic Accessories'),('Plastic Accessories','zh','塑料配件'),('Plastic Accessories','ko','플라스틱 부자재'),('Plastic Accessories','ja','プラスチック部品'),
    ('Tools & Equipment','en','Tools & Equipment'),('Tools & Equipment','zh','工具与设备'),('Tools & Equipment','ko','공구 및 장비'),('Tools & Equipment','ja','工具・設備')
)
insert into public.category_translations (category_id, locale, name)
select category_name, locale, translated_name
from translation_values
on conflict (category_id, locale) do update
set name = excluded.name;

create or replace function public.sync_category_name_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.products
    set category = new.name
    where category_id = new.id or category = old.name;

    update public.category_translations
    set category_id = new.name
    where category_id = old.name;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_sync_name_changes on public.categories;
create trigger categories_sync_name_changes
before update on public.categories
for each row execute function public.sync_category_name_changes();

create or replace function public.save_catalog_category(
  p_category_id uuid,
  p_name text,
  p_slug text,
  p_parent_id uuid,
  p_sort_order integer,
  p_status text,
  p_name_zh text,
  p_name_ko text,
  p_name_ja text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved_id uuid;
  clean_name text := trim(p_name);
  clean_slug text := lower(trim(p_slug));
begin
  if clean_name = '' or clean_slug = '' then
    raise exception 'CATEGORY_NAME_AND_SLUG_REQUIRED';
  end if;

  if p_category_id is not null and p_parent_id = p_category_id then
    raise exception 'CATEGORY_CANNOT_PARENT_ITSELF';
  end if;

  if p_category_id is not null and p_parent_id is not null and exists (
    with recursive descendants as (
      select id from public.categories where parent_id = p_category_id
      union all
      select child.id
      from public.categories child
      join descendants parent on child.parent_id = parent.id
    )
    select 1 from descendants where id = p_parent_id
  ) then
    raise exception 'CATEGORY_CYCLE_NOT_ALLOWED';
  end if;

  if p_category_id is null then
    insert into public.categories (name, slug, parent_id, sort_order, status)
    values (clean_name, clean_slug, p_parent_id, greatest(coalesce(p_sort_order, 0), 0), p_status)
    returning id into saved_id;
  else
    update public.categories
    set name = clean_name,
        slug = clean_slug,
        parent_id = p_parent_id,
        sort_order = greatest(coalesce(p_sort_order, 0), 0),
        status = p_status
    where id = p_category_id
    returning id into saved_id;
  end if;

  if saved_id is null then
    raise exception 'CATEGORY_NOT_FOUND';
  end if;

  insert into public.category_translations (category_id, locale, name)
  values
    (clean_name, 'en', clean_name),
    (clean_name, 'zh', coalesce(nullif(trim(p_name_zh), ''), clean_name)),
    (clean_name, 'ko', coalesce(nullif(trim(p_name_ko), ''), clean_name)),
    (clean_name, 'ja', coalesce(nullif(trim(p_name_ja), ''), clean_name))
  on conflict (category_id, locale) do update
  set name = excluded.name;

  return saved_id;
end;
$$;

create or replace function public.delete_catalog_category(
  p_category_id uuid,
  p_replacement_category_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  source_name text;
  replacement_name text;
  assigned_count integer;
begin
  select name into source_name
  from public.categories
  where id = p_category_id
  for update;

  if source_name is null then
    raise exception 'CATEGORY_NOT_FOUND';
  end if;

  if exists (select 1 from public.categories where parent_id = p_category_id) then
    raise exception 'CATEGORY_HAS_CHILDREN';
  end if;

  select count(*) into assigned_count
  from public.products
  where category_id = p_category_id or (category_id is null and category = source_name);

  if assigned_count > 0 then
    if p_replacement_category_id is null or p_replacement_category_id = p_category_id then
      raise exception 'REPLACEMENT_CATEGORY_REQUIRED';
    end if;

    select name into replacement_name
    from public.categories
    where id = p_replacement_category_id and status = 'active';

    if replacement_name is null then
      raise exception 'REPLACEMENT_CATEGORY_NOT_FOUND';
    end if;

    update public.products
    set category_id = p_replacement_category_id,
        category = replacement_name
    where category_id = p_category_id or (category_id is null and category = source_name);
  end if;

  delete from public.category_translations where category_id = source_name;
  delete from public.categories where id = p_category_id;
end;
$$;

revoke all on table public.categories from public, anon, authenticated;
grant select on table public.categories to anon, authenticated;
grant select, insert, update, delete on table public.categories to service_role;

alter table public.categories enable row level security;
drop policy if exists "Public reads active categories" on public.categories;
create policy "Public reads active categories"
on public.categories for select
to anon, authenticated
using (status = 'active');

revoke all on function public.save_catalog_category(uuid,text,text,uuid,integer,text,text,text,text) from public, anon, authenticated;
grant execute on function public.save_catalog_category(uuid,text,text,uuid,integer,text,text,text,text) to service_role;
revoke all on function public.delete_catalog_category(uuid,uuid) from public, anon, authenticated;
grant execute on function public.delete_catalog_category(uuid,uuid) to service_role;

notify pgrst, 'reload schema';
