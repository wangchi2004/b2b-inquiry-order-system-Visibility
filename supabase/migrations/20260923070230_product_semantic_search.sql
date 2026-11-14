create extension if not exists vector with schema extensions;
create table public.product_embeddings (
  product_id uuid primary key references public.products(id) on delete cascade,
  embedding extensions.vector(1536),
  embedding_model text not null default 'text-embedding-3-small',
  revision bigint not null default 1,
  status text not null default 'pending' check(status in ('pending','processing','ready')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  lease_token uuid,
  last_error text,
  updated_at timestamptz not null default now()
);
alter table public.product_embeddings enable row level security;
revoke all on public.product_embeddings from anon,authenticated;
grant select,insert,update,delete on public.product_embeddings to service_role;
create index product_embeddings_pending_idx on public.product_embeddings(status,next_attempt_at);

create function public.queue_product_embedding() returns trigger language plpgsql security invoker set search_path='' as $$
declare pid uuid;
begin
  if tg_table_name='products' then pid:=new.id;
  elsif tg_op='DELETE' then pid:=old.product_id;
  else pid:=new.product_id; end if;
  if exists(select 1 from public.products where id=pid) then
    insert into public.product_embeddings(product_id) values(pid)
    on conflict(product_id) do update set revision=public.product_embeddings.revision+1,
      status='pending',attempts=0,next_attempt_at=now(),lease_until=null,lease_token=null,last_error=null,updated_at=now();
  end if;
  if tg_table_name <> 'products' then
   if tg_op='UPDATE' then
    if old.product_id is distinct from new.product_id then
    insert into public.product_embeddings(product_id) select old.product_id where exists(select 1 from public.products where id=old.product_id)
    on conflict(product_id) do update set revision=public.product_embeddings.revision+1,status='pending',next_attempt_at=now(),lease_until=null,lease_token=null,updated_at=now();
  end if;
   end if;
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;
revoke all on function public.queue_product_embedding() from public,anon,authenticated;
grant execute on function public.queue_product_embedding() to service_role;
create trigger products_embedding_insert after insert on public.products for each row execute function public.queue_product_embedding();
create trigger products_embedding_update after update of name,slug,sku,description,category,category_id,material,color,size,keywords,status on public.products for each row execute function public.queue_product_embedding();
create trigger variants_embedding_change after insert or delete or update of sku,color,size,product_id on public.product_variants for each row execute function public.queue_product_embedding();
create trigger translations_embedding_change after insert or delete or update on public.product_translations for each row execute function public.queue_product_embedding();
insert into public.product_embeddings(product_id) select id from public.products where status='active';

create function public.claim_product_embeddings(p_limit integer default 5)
returns setof public.product_embeddings language sql security invoker set search_path='' as $$
  update public.product_embeddings e set status='processing',lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid(),attempts=e.attempts+1
  where product_id in (
    select product_id from public.product_embeddings
    where (status='pending' and next_attempt_at<=now()) or (status='processing' and lease_until<now())
    order by updated_at limit greatest(1,least(p_limit,10)) for update skip locked
  ) returning e.*;
$$;
revoke all on function public.claim_product_embeddings(integer) from public,anon,authenticated;
grant execute on function public.claim_product_embeddings(integer) to service_role;

create function public.match_product_embeddings(p_embedding extensions.vector(1536),p_model text,
  p_color text default '',p_size text default '',p_material text default '',p_availability text default '')
returns table(product_id uuid,similarity double precision)
language sql stable security invoker set search_path='' as $$
  select e.product_id,1-(e.embedding operator(extensions.<=>) p_embedding) as similarity
  from public.product_embeddings e
  join public.products p on p.id=e.product_id
  join public.search_storefront_products('',p_color,p_size,p_material,p_availability) f on f.product_id=e.product_id
  where p.status='active' and e.status='ready' and e.embedding_model=p_model and e.embedding is not null
    and 1-(e.embedding operator(extensions.<=>) p_embedding)>=0.35
  order by e.embedding operator(extensions.<=>) p_embedding,e.product_id limit 20;
$$;
revoke all on function public.match_product_embeddings(extensions.vector,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.match_product_embeddings(extensions.vector,text,text,text,text,text) to service_role;
