create table public.customer_addresses (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 recipient text not null check(length(recipient) between 1 and 150), phone text not null check(length(phone) between 1 and 80),
 country text not null check(length(country) between 1 and 100), region text not null default '', city text not null default '',
 postal_code text not null default '', address text not null check(length(address) between 1 and 1000),
 company text not null default '', note text not null default '', is_default boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index customer_addresses_owner on public.customer_addresses(user_id);
create unique index customer_addresses_default on public.customer_addresses(user_id) where is_default;
alter table public.customer_addresses enable row level security;
revoke all on public.customer_addresses from anon,authenticated;
grant select on public.customer_addresses to authenticated;
grant all on public.customer_addresses to service_role;
create policy addresses_read_own on public.customer_addresses for select to authenticated using ((select auth.uid())=user_id);
create function public.manage_customer_address(p_user uuid,p_action text,p_id uuid default null,p_data jsonb default '{}'::jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare current_default boolean; desired boolean; next_id uuid;
begin
 if p_user is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('address:'||p_user::text,0));
 if p_id is not null then
  select is_default into current_default from public.customer_addresses where id=p_id and user_id=p_user for update;
  if not found then raise exception 'ADDRESS_NOT_FOUND'; end if;
 end if;
 if p_action='save' then
  if p_id is null and (select count(*) from public.customer_addresses where user_id=p_user)>=20 then raise exception 'ADDRESS_LIMIT'; end if;
  desired := coalesce((p_data->>'is_default')::boolean,false) or coalesce(current_default,false) or not exists(select 1 from public.customer_addresses where user_id=p_user);
  if desired then update public.customer_addresses set is_default=false where user_id=p_user and is_default; end if;
  if p_id is null then
   insert into public.customer_addresses(user_id,recipient,phone,country,region,city,postal_code,address,company,note,is_default)
   values(p_user,p_data->>'recipient',p_data->>'phone',p_data->>'country',coalesce(p_data->>'region',''),coalesce(p_data->>'city',''),coalesce(p_data->>'postal_code',''),p_data->>'address',coalesce(p_data->>'company',''),coalesce(p_data->>'note',''),desired);
  else
   update public.customer_addresses set recipient=p_data->>'recipient',phone=p_data->>'phone',country=p_data->>'country',region=coalesce(p_data->>'region',''),city=coalesce(p_data->>'city',''),postal_code=coalesce(p_data->>'postal_code',''),address=p_data->>'address',company=coalesce(p_data->>'company',''),note=coalesce(p_data->>'note',''),is_default=desired,updated_at=now() where id=p_id and user_id=p_user;
  end if;
 elsif p_action='default' and p_id is not null then
  update public.customer_addresses set is_default=false where user_id=p_user and is_default;
  update public.customer_addresses set is_default=true,updated_at=now() where id=p_id and user_id=p_user;
 elsif p_action='delete' and p_id is not null then
  delete from public.customer_addresses where id=p_id and user_id=p_user;
  if current_default then
   select id into next_id from public.customer_addresses where user_id=p_user order by created_at,id limit 1;
   update public.customer_addresses set is_default=true where id=next_id;
  end if;
 else raise exception 'INVALID_ACTION'; end if;
end $$;
revoke all on function public.manage_customer_address(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.manage_customer_address(uuid,text,uuid,jsonb) to service_role;
