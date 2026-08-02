-- Add brand subcategories under Replacement Soles.
-- Safe to run more than once.

do $$
declare
  parent_category_id uuid;
begin
  select id into parent_category_id
  from public.categories
  where slug = 'replacement-soles'
  limit 1;

  if parent_category_id is null then
    select id into parent_category_id
    from public.categories
    where name = 'Replacement Soles'
    limit 1;
  end if;

  if parent_category_id is null then
    raise exception 'Replacement Soles category not found';
  end if;

  insert into public.categories (name, slug, parent_id, sort_order)
  values
    ('PRADA', 'prada', parent_category_id, 140),
    ('Loro Piana', 'loro-piana', parent_category_id, 141),
    ('Balenciaga', 'balenciaga', parent_category_id, 142),
    ('Louis Vuitton (LV)', 'louis-vuitton-lv', parent_category_id, 143),
    ('Gucci', 'gucci', parent_category_id, 144)
  on conflict (slug) do update
  set name = excluded.name,
      parent_id = excluded.parent_id,
      sort_order = excluded.sort_order;
end $$;

with translation_values(slug, locale, name) as (
  values
    ('prada', 'en', 'PRADA'),
    ('prada', 'zh', 'PRADA'),
    ('prada', 'ko', '프라다'),
    ('prada', 'ja', 'プラダ'),
    ('loro-piana', 'en', 'Loro Piana'),
    ('loro-piana', 'zh', 'Loro Piana'),
    ('loro-piana', 'ko', '로로피아나'),
    ('loro-piana', 'ja', 'ロロ・ピアーナ'),
    ('balenciaga', 'en', 'Balenciaga'),
    ('balenciaga', 'zh', 'Balenciaga'),
    ('balenciaga', 'ko', '발렌시아가'),
    ('balenciaga', 'ja', 'バレンシアガ'),
    ('louis-vuitton-lv', 'en', 'Louis Vuitton (LV)'),
    ('louis-vuitton-lv', 'zh', 'Louis Vuitton (LV)'),
    ('louis-vuitton-lv', 'ko', '루이비통 (LV)'),
    ('louis-vuitton-lv', 'ja', 'ルイ・ヴィトン (LV)'),
    ('gucci', 'en', 'Gucci'),
    ('gucci', 'zh', 'Gucci'),
    ('gucci', 'ko', '구찌'),
    ('gucci', 'ja', 'グッチ')
),
joined_values as (
  select c.id as category_id, tv.locale, tv.name
  from translation_values tv
  join public.categories c on c.slug = tv.slug
)
insert into public.category_translations (category_id, locale, name)
select category_id, locale, name
from joined_values
on conflict (category_id, locale) do update
set name = excluded.name;
