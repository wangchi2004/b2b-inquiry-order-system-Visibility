begin;

create extension if not exists pgcrypto;

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_matches text[] not null default '{}',
  locale text not null default 'en',
  subject text not null,
  greeting text not null,
  body text not null,
  website_button_label text not null default 'Visit Website',
  closing text not null default 'Best regards',
  signature text not null default 'Wang Chi',
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_templates_one_active_default_idx
  on public.email_templates (is_default)
  where is_default = true and status = 'active';

create table if not exists public.email_template_products (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.email_templates(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (template_id, product_id)
);

create index if not exists email_template_products_template_idx
  on public.email_template_products (template_id, sort_order);

create table if not exists public.email_send_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  template_id uuid references public.email_templates(id) on delete set null,
  recipient_email text not null,
  country text,
  template_name text not null,
  subject_snapshot text not null,
  html_snapshot text not null,
  text_snapshot text not null,
  status text not null default 'sending' check (status in ('sending', 'success', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists email_send_logs_recipient_idx
  on public.email_send_logs (lower(recipient_email), created_at desc);

create index if not exists email_send_logs_status_idx
  on public.email_send_logs (status, created_at desc);

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.email_templates to service_role;
grant select, insert, update, delete on table public.email_template_products to service_role;
grant select, insert, update, delete on table public.email_send_logs to service_role;

create or replace function public.set_email_campaign_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at
before update on public.email_templates
for each row execute function public.set_email_campaign_updated_at();

drop trigger if exists email_send_logs_set_updated_at on public.email_send_logs;
create trigger email_send_logs_set_updated_at
before update on public.email_send_logs
for each row execute function public.set_email_campaign_updated_at();

create or replace function public.enforce_email_template_product_limit()
returns trigger
language plpgsql
as $$
declare
  product_count integer;
begin
  select count(*)
  into product_count
  from public.email_template_products
  where template_id = new.template_id
    and (tg_op <> 'UPDATE' or id <> new.id);

  if product_count >= 6 then
    raise exception 'EMAIL_TEMPLATE_PRODUCT_LIMIT';
  end if;

  return new;
end;
$$;

drop trigger if exists email_template_product_limit on public.email_template_products;
create trigger email_template_product_limit
before insert or update on public.email_template_products
for each row execute function public.enforce_email_template_product_limit();

create or replace function public.reserve_email_campaign_send(
  p_customer_id uuid,
  p_template_id uuid,
  p_recipient_email text,
  p_country text,
  p_template_name text,
  p_subject_snapshot text,
  p_html_snapshot text,
  p_text_snapshot text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(p_recipient_email));
  new_log_id uuid;
begin
  if normalized_email = '' then
    raise exception 'EMAIL_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 0));

  if normalized_email <> 'wangchi.2004@gmail.com' and exists (
    select 1
    from public.email_send_logs
    where lower(trim(recipient_email)) = normalized_email
      and (
        (status = 'success' and sent_at >= now() - interval '15 days')
        or
        (status = 'sending' and created_at >= now() - interval '15 minutes')
      )
  ) then
    raise exception 'EMAIL_COOLDOWN_ACTIVE';
  end if;

  insert into public.email_send_logs (
    customer_id,
    template_id,
    recipient_email,
    country,
    template_name,
    subject_snapshot,
    html_snapshot,
    text_snapshot,
    status
  ) values (
    p_customer_id,
    p_template_id,
    normalized_email,
    nullif(trim(p_country), ''),
    p_template_name,
    p_subject_snapshot,
    p_html_snapshot,
    p_text_snapshot,
    'sending'
  )
  returning id into new_log_id;

  return new_log_id;
end;
$$;

revoke all on function public.reserve_email_campaign_send(
  uuid, uuid, text, text, text, text, text, text
) from public;
grant execute on function public.reserve_email_campaign_send(
  uuid, uuid, text, text, text, text, text, text
) to service_role;

do $$
begin
  if not exists (
    select 1
    from public.email_templates
    where is_default = true and status = 'active'
  ) then
    insert into public.email_templates (
      name,
      country_matches,
      locale,
      subject,
      greeting,
      body,
      website_button_label,
      closing,
      signature,
      is_default,
      status
    ) values (
      'English Default',
      '{}',
      'en',
      'New Shoe Repair Materials and Featured Products',
      'Dear {customer_name},',
      E'We would like to share our latest shoe repair materials and featured products with you.\n\nPlease visit our website to view more products. If anything interests you, reply to this email and we will confirm the price, stock, and shipping cost.',
      'Visit Website',
      'Best regards',
      'Wang Chi',
      true,
      'active'
    );
  end if;
end;
$$;

commit;
