create table if not exists business_leads (
  id uuid primary key default gen_random_uuid(),
  source_file text not null,
  source_row_number integer not null,
  business_name text not null,
  category text,
  target_type text not null check (target_type in ('shoe_repair', 'shoe_related', 'adjacent_service', 'irrelevant')),
  is_target_business boolean not null default false,
  exclusion_reason text,
  street text,
  city text,
  state text,
  country_code text,
  phone_raw text,
  phone_e164 text,
  website text,
  website_domain text,
  email text,
  google_maps_url text,
  google_place_id text,
  image_url text,
  rating numeric(3, 2),
  reviews_count integer,
  lead_score integer not null default 0 check (lead_score >= 0 and lead_score <= 100),
  marketing_status text not null default 'new',
  quality_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (google_place_id)
);

create index if not exists idx_business_leads_target_score
  on business_leads(target_type, lead_score desc);

create index if not exists idx_business_leads_city_state
  on business_leads(city, state);

create index if not exists idx_business_leads_phone
  on business_leads(phone_e164);

create index if not exists idx_business_leads_website_domain
  on business_leads(website_domain);

drop trigger if exists set_business_leads_updated_at on business_leads;
create trigger set_business_leads_updated_at
before update on business_leads
for each row execute function set_updated_at();

grant usage on schema public to service_role;
grant select, insert, update, delete on business_leads to service_role;
