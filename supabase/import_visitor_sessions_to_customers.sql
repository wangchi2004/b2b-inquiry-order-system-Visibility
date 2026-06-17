alter table customers
  add column if not exists shop_name text,
  add column if not exists city text,
  add column if not exists business_type text,
  add column if not exists source text,
  add column if not exists source_url text,
  add column if not exists status text not null default 'prospecting',
  add column if not exists stage text,
  add column if not exists score integer not null default 0,
  add column if not exists owner text,
  add column if not exists last_contacted_at date,
  add column if not exists email_valid boolean not null default true,
  add column if not exists unsubscribed boolean not null default false;

insert into customers (
  email,
  name,
  country,
  status,
  stage,
  source,
  score,
  created_at,
  updated_at
)
select
  lower(trim(email)) as email,
  lower(trim(email)) as name,
  nullif(trim(country), '') as country,
  'prospecting' as status,
  'new' as stage,
  'website_login' as source,
  0 as score,
  coalesce(first_seen_at, now()) as created_at,
  coalesce(last_seen_at, now()) as updated_at
from visitor_sessions
where email is not null
  and trim(email) <> ''
on conflict (email) do update
set
  country = coalesce(excluded.country, customers.country),
  status = coalesce(customers.status, excluded.status),
  stage = coalesce(customers.stage, excluded.stage),
  source = coalesce(customers.source, excluded.source),
  updated_at = greatest(customers.updated_at, excluded.updated_at);

grant select, insert, update, delete on customers to service_role;
