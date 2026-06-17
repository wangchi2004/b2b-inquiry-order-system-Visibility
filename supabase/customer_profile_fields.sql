alter table customers
  add column if not exists phone text,
  add column if not exists customer_note text,
  add column if not exists instagram text,
  add column if not exists website text,
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

grant select, insert, update, delete on customers to service_role;
grant delete on order_links to service_role;
