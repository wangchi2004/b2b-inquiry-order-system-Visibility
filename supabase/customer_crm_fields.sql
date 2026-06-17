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

create table if not exists customer_tags (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (customer_id, tag)
);

create table if not exists suppression_list (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_status
  on customers(status);

create index if not exists idx_customers_score
  on customers(score);

create index if not exists idx_customer_tags_customer_id
  on customer_tags(customer_id);

grant select, insert, update, delete on customers to service_role;
grant select, insert, update, delete on customer_tags to service_role;
grant select, insert, update, delete on suppression_list to service_role;
grant delete on order_links to service_role;
