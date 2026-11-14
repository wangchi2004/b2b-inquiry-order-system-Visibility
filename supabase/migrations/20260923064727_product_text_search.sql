-- Additive only: reuse catalog and variant data; no price or stock writes.
alter table public.products add column if not exists keywords text[] not null default '{}';
create index if not exists product_variants_product_id_idx on public.product_variants(product_id);

create function public.search_storefront_products(
  p_query text default '', p_color text default '', p_size text default '',
  p_material text default '', p_availability text default ''
) returns table(product_id uuid, relevance integer)
language sql stable security invoker set search_path = '' as $$
  with terms as (
    select distinct term from pg_catalog.regexp_split_to_table(lower(left(trim(coalesce(p_query,'')),200)), '[[:space:]]+') term
    where term <> '' and term not in ('size','sizes')
  ), candidates as (
    select p.id, p.name, p.sku as product_sku, v.sku,
      lower(concat_ws(' ',p.name,p.slug,p.sku,p.description,p.category,c.name,p.material,
        coalesce(nullif(v.color,''),p.color),coalesce(nullif(v.size,''),p.size),v.sku,
        array_to_string(p.keywords,' '),tr.words)) as words
    from public.products p
    left join public.categories c on c.id=p.category_id
    left join public.product_variants v on v.product_id=p.id
    left join lateral (
      select string_agg(concat_ws(' ',t.name,t.description),' ') as words
      from public.product_translations t where t.product_id=p.id
    ) tr on true
    where p.status='active'
      and (coalesce(p_color,'')='' or lower(coalesce(nullif(v.color,''),p.color,''))=lower(p_color))
      and (coalesce(p_size,'')='' or lower(coalesce(nullif(v.size,''),p.size,''))=lower(p_size))
      and (coalesce(p_material,'')='' or lower(coalesce(p.material,''))=lower(p_material))
      and (coalesce(p_availability,'')='' or v.stock_status=p_availability)
  )
  select c.id, max(case
    when lower(coalesce(c.sku,c.product_sku,''))=lower(trim(p_query)) then 100
    when lower(c.name)=lower(trim(p_query)) then 80
    when strpos(lower(c.name),lower(trim(p_query)))>0 then 60
    else 20 end)::integer
  from candidates c
  where not exists (
    select 1 from terms t where not (
      pg_catalog.to_tsvector('pg_catalog.english',c.words) @@ pg_catalog.plainto_tsquery('pg_catalog.english',t.term)
      or (t.term !~ '^[0-9]+([.][0-9]+)?$' and strpos(c.words,t.term)>0)
    )
  )
  group by c.id order by 2 desc,c.id;
$$;
revoke all on function public.search_storefront_products(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.search_storefront_products(text,text,text,text,text) to service_role;
