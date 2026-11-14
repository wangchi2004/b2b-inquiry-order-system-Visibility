create table public.customer_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index customer_favorites_product_idx on public.customer_favorites(product_id);
alter table public.customer_favorites enable row level security;
revoke all on public.customer_favorites from anon, authenticated;
grant select, insert, delete on public.customer_favorites to authenticated;
grant all on public.customer_favorites to service_role;
create policy favorites_select_own on public.customer_favorites for select to authenticated using ((select auth.uid()) = user_id);
create policy favorites_insert_own on public.customer_favorites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy favorites_delete_own on public.customer_favorites for delete to authenticated using ((select auth.uid()) = user_id);
