create table public.customer_carts(user_id uuid primary key references auth.users(id) on delete cascade, items jsonb not null default '{}'::jsonb, revision bigint not null default 0);
create table public.customer_cart_operations(user_id uuid not null references auth.users(id) on delete cascade, operation_id uuid not null, created_at timestamptz not null default now(), primary key(user_id,operation_id));
alter table public.customer_carts enable row level security;
alter table public.customer_cart_operations enable row level security;
revoke all on public.customer_carts,public.customer_cart_operations from anon,authenticated;
grant all on public.customer_carts,public.customer_cart_operations to service_role;
create function public.mutate_customer_cart(p_user uuid,p_operation uuid,p_changes jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare state jsonb; line jsonb; key text; qty integer; previous integer; operation text;
begin
 if p_user is null or p_operation is null or jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes)>200 then raise exception 'INVALID_CART'; end if;
 perform pg_advisory_xact_lock(hashtextextended('cart:'||p_user::text,0));
 if exists(select 1 from public.customer_cart_operations where user_id=p_user and operation_id=p_operation) then return; end if;
 insert into public.customer_carts(user_id) values(p_user) on conflict do nothing;
 select items into state from public.customer_carts where user_id=p_user for update;
 for line in select value from jsonb_array_elements(p_changes) loop
  key := (line->>'variantId')::uuid::text; operation := line->>'type'; qty := coalesce((line->>'quantity')::integer,0); previous := coalesce((state->>key)::integer,0);
  if operation in ('set','remove') and previous<>coalesce((line->>'expected')::integer,-1) then raise exception 'CART_CONFLICT'; end if;
  if operation in ('add','set') then
   if qty not between 1 and 100000 then raise exception 'INVALID_CART'; end if;
   if not exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=key::uuid and p.status='active') then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  end if;
  if operation='add' then qty := previous+qty;
  elsif operation='set' then null;
  elsif operation='remove' then qty := 0;
  elsif operation='consume' and qty between 1 and 100000 then qty := greatest(0,previous-qty);
  else raise exception 'INVALID_CART'; end if;
  if qty>100000 then raise exception 'CART_LIMIT'; end if;
  if qty=0 then state:=state-key; else state:=jsonb_set(state,array[key],to_jsonb(qty)); end if;
 end loop;
 if (select count(*) from jsonb_object_keys(state))>200 then raise exception 'CART_LIMIT'; end if;
 update public.customer_carts set items=state,revision=revision+1 where user_id=p_user;
 insert into public.customer_cart_operations(user_id,operation_id) values(p_user,p_operation);
end $$;
revoke all on function public.mutate_customer_cart(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.mutate_customer_cart(uuid,uuid,jsonb) to service_role;
