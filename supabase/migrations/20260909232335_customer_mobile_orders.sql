-- Review and apply to a staging database before production.
begin;
grant select, update on public.products, public.product_variants to service_role;
create table if not exists public.mobile_customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null, company text not null default '', country text not null,
  phone text not null default '', address text not null
);
alter table public.mobile_customer_profiles enable row level security;
revoke all on public.mobile_customer_profiles from anon, authenticated;
grant all on public.mobile_customer_profiles to service_role;

alter table public.orders
  add column if not exists mobile_user_id uuid references auth.users(id) on delete set null,
  add column if not exists mobile_request_key text,
  add column if not exists mobile_request_items jsonb,
  add column if not exists product_subtotal numeric(12,2),
  add column if not exists shipping_fee numeric(12,2),
  add column if not exists grand_total numeric(12,2),
  add column if not exists quote_updated_at timestamptz,
  add column if not exists shipping_recipient_name text,
  add column if not exists shipping_phone text,
  add column if not exists shipping_country text,
  add column if not exists shipping_address text,
  add column if not exists shipping_carrier text,
  add column if not exists tracking_number text;
alter table public.order_items add column if not exists unit_price numeric(12,2);
create unique index if not exists mobile_order_request_unique on public.orders(mobile_user_id,mobile_request_key);
create index if not exists mobile_order_user_date on public.orders(mobile_user_id,created_at desc);
-- All private data stays behind server-side authorization. Existing server admin access is preserved.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.customers enable row level security;
revoke all on public.orders, public.order_items, public.customers from anon, authenticated;
grant select,insert,update,delete on public.orders, public.order_items, public.customers to service_role;

create or replace function public.submit_mobile_order(p_user uuid,p_email text,p_key text,p_items jsonb,p_locale text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  existing public.orders%rowtype;
  profile public.mobile_customer_profiles%rowtype;
  line jsonb;
  variant record;
  customer_id_value uuid;
  order_id_value uuid;
  subtotal numeric := 0;
begin
  -- Server-only RPC: caller validates the access token and supplies its verified user id/email.
  -- service_role cannot SELECT auth.users in hosted Supabase. Identity was verified
  -- by auth.getUser() in the server API; this RPC is not executable by clients.
  if p_user is null or nullif(p_email,'') is null then raise exception 'LOGIN_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || ':' || p_key,0));
  select * into existing from public.orders where mobile_user_id=p_user and mobile_request_key=p_key;
  if found then
    if existing.mobile_request_items <> p_items then raise exception 'KEY_REUSED'; end if;
    return existing.id;
  end if;
  select * into profile from public.mobile_customer_profiles where user_id=p_user;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'INVALID_INPUT'; end if;
  -- Lock catalog rows until the snapshot is committed, including product availability.
  for line in select value from jsonb_array_elements(p_items) order by value->>'variantId' loop
    select v.*, p.name as product_name, p.status as product_status into variant
    from public.product_variants v join public.products p on p.id=v.product_id
    where v.id=(line->>'variantId')::uuid for share of v,p;
    if not found or variant.product_status <> 'active' or variant.stock_status='out_of_stock' or variant.price is null or variant.price<0 then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    if variant.price <> (line->>'unitPrice')::numeric then raise exception 'PRICE_CHANGED'; end if;
    if (line->>'quantity')::integer not between 1 and 100000 then raise exception 'INVALID_INPUT'; end if;
    subtotal := subtotal + variant.price*(line->>'quantity')::integer;
  end loop;
  insert into public.customers(name,email,country,company) values(profile.name,p_email,profile.country,profile.company)
    on conflict(email) do update set email=excluded.email returning id into customer_id_value;
  insert into public.orders(customer_id,customer_email,country,status,locale,mobile_user_id,mobile_request_key,mobile_request_items,product_subtotal,shipping_recipient_name,shipping_phone,shipping_country,shipping_address)
  values(customer_id_value,p_email,profile.country,'new',p_locale,p_user,p_key,p_items,subtotal,profile.name,profile.phone,profile.country,profile.address) returning id into order_id_value;
  insert into public.order_items(order_id,product_id,variant_id,product_name,sku,size,color,quantity,unit,unit_price)
  select order_id_value,v.product_id,v.id,p.name,v.sku,v.size,v.color,(l.value->>'quantity')::integer,v.unit,v.price
  from jsonb_array_elements(p_items) l join public.product_variants v on v.id=(l.value->>'variantId')::uuid join public.products p on p.id=v.product_id;
  return order_id_value;
end $$;
revoke all on function public.submit_mobile_order(uuid,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.submit_mobile_order(uuid,text,text,jsonb,text) to service_role;
create table if not exists public.mobile_order_events (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  status text not null, created_at timestamptz not null default now()
);
alter table public.mobile_order_events enable row level security;
revoke all on public.mobile_order_events from anon,authenticated;
grant all on public.mobile_order_events to service_role;
create or replace function public.record_mobile_order_status() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.mobile_user_id is not null then
    if TG_OP='INSERT' then
      insert into public.mobile_order_events(order_id,status) values(new.id,new.status);
    elsif old.status is distinct from new.status then
      insert into public.mobile_order_events(order_id,status) values(new.id,new.status);
    end if;
  end if;
  return new;
end $$;
revoke all on function public.record_mobile_order_status() from public,anon,authenticated;
drop trigger if exists mobile_order_status on public.orders;
create trigger mobile_order_status after insert or update of status on public.orders for each row execute function public.record_mobile_order_status();

create or replace function public.manage_mobile_order(p_id uuid,p_action text,p_shipping numeric default null,p_carrier text default null,p_tracking text default null)
returns void language plpgsql security invoker set search_path='' as $$
declare o public.orders%rowtype; subtotal numeric;
begin
  select * into o from public.orders where id=p_id and mobile_user_id is not null for update;
  if not found then raise exception 'Mobile order not found'; end if;
  if p_action='quote' then
    if o.status not in ('new','quoted') or p_shipping is null or p_shipping < 0 then raise exception 'A non-negative shipping fee and an unconfirmed order are required'; end if;
    select sum(quantity*unit_price) into subtotal from public.order_items where order_id=p_id;
    update public.orders set product_subtotal=subtotal,shipping_fee=p_shipping,grand_total=subtotal+p_shipping,
      quote_updated_at=clock_timestamp(),status='quoted' where id=p_id;
  elsif p_action='processing' and o.status='confirmed' then
    update public.orders set status='processing' where id=p_id;
  elsif p_action='shipped' and o.status in ('confirmed','processing') and nullif(trim(p_tracking),'') is not null and nullif(trim(p_carrier),'') is not null then
    update public.orders set status='shipped',shipping_carrier=trim(p_carrier),tracking_number=trim(p_tracking) where id=p_id;
  elsif p_action='completed' and o.status='shipped' then
    update public.orders set status='completed' where id=p_id;
  elsif p_action='cancelled' and o.status in ('new','quoted','confirmed','processing') then
    update public.orders set status='cancelled' where id=p_id;
  else raise exception 'Invalid order transition'; end if;
end $$;
revoke all on function public.manage_mobile_order(uuid,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.manage_mobile_order(uuid,text,numeric,text,text) to service_role;
commit;
