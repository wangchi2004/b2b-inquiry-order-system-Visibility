create table if not exists public.sample_visitors (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null unique,
  locale text not null default 'en',
  page_path text,
  visit_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.sample_clicks (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  locale text not null default 'en',
  event_name text not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  page_path text,
  click_count integer not null default 1,
  first_clicked_at timestamptz not null default now(),
  last_clicked_at timestamptz not null default now(),
  unique (visitor_id, event_name, product_id, page_path)
);

create index if not exists sample_visitors_last_seen_at_idx
  on public.sample_visitors (last_seen_at desc);

create index if not exists sample_clicks_event_name_idx
  on public.sample_clicks (event_name);

create index if not exists sample_clicks_last_clicked_at_idx
  on public.sample_clicks (last_clicked_at desc);

grant select, insert, update, delete on public.sample_visitors to service_role;
grant select, insert, update, delete on public.sample_clicks to service_role;
