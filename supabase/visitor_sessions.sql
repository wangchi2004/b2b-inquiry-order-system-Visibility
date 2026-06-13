create extension if not exists pgcrypto;

create table if not exists public.visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  country text,
  locale text not null default 'en',
  visit_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists visitor_sessions_last_seen_at_idx
  on public.visitor_sessions (last_seen_at desc);

create index if not exists visitor_sessions_locale_idx
  on public.visitor_sessions (locale);
