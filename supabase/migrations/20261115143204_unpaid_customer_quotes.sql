alter table public.orders add column payment_status text not null default 'unknown' check(payment_status in ('unknown','unpaid','paid')), add column paid_at timestamptz, add column quote_ready_at timestamptz;
alter table public.orders alter column payment_status set default 'unpaid';
create table public.order_payment_events(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,action text not null,previous_status text not null,new_status text not null,created_at timestamptz not null default now());
alter table public.order_payment_events enable row level security;
revoke all on public.order_payment_events from anon,authenticated;
grant all on public.order_payment_events to service_role;
create function public.invalidate_ready_quote() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.product_subtotal,new.shipping_fee,new.grand_total,new.paypal_fee,new.paypal_collection,new.quote_updated_at) is distinct from (old.product_subtotal,old.shipping_fee,old.grand_total,old.paypal_fee,old.paypal_collection,old.quote_updated_at) then new.quote_ready_at:=null; end if;
 return new;
end $$;
create trigger invalidate_order_quote before update on public.orders for each row execute function public.invalidate_ready_quote();
create function public.invalidate_item_quote() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP<>'UPDATE' or (new.product_id,new.variant_id,new.quantity,new.unit_price,new.size,new.color,new.sku) is distinct from (old.product_id,old.variant_id,old.quantity,old.unit_price,old.size,old.color,old.sku) then
  if TG_OP<>'DELETE' then update public.orders set quote_ready_at=null where id=new.order_id; end if;
  if TG_OP<>'INSERT' then update public.orders set quote_ready_at=null where id=old.order_id; end if;
 end if;
 return null;
end $$;
create trigger invalidate_order_item_quote after insert or update or delete on public.order_items for each row execute function public.invalidate_item_quote();
create function public.manage_order_payment(p_id uuid,p_action text,p_version timestamptz default null) returns void language plpgsql security invoker set search_path='' as $$
declare o public.orders%rowtype; subtotal numeric; n integer;
begin
 select * into o from public.orders where id=p_id for update;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if p_action='publish' then
  if o.payment_status='paid' or o.status not in ('new','submitted','quoted','confirmed') then raise exception 'ORDER_NOT_ELIGIBLE'; end if;
  if p_version is null or o.quote_updated_at is distinct from p_version then raise exception 'QUOTE_CHANGED'; end if;
  select count(*),sum(quantity*unit_price) into n,subtotal from public.order_items where order_id=p_id;
  if n=0 or exists(select 1 from public.order_items where order_id=p_id and (unit_price is null or unit_price<0 or quantity<=0)) or o.product_subtotal is null or o.shipping_fee is null or o.grand_total is null or o.shipping_fee<0 or o.product_subtotal<0 or abs(o.product_subtotal-subtotal)>0.01 or abs(o.grand_total-o.product_subtotal-o.shipping_fee)>0.01 then raise exception 'COMPLETE_QUOTE_REQUIRED'; end if;
  if o.quote_ready_at is not null and o.payment_status='unpaid' then return; end if;
  update public.orders set payment_status='unpaid',quote_ready_at=clock_timestamp(),status='quoted' where id=p_id;
  insert into public.order_payment_events(order_id,action,previous_status,new_status) values(p_id,'publish',o.payment_status,'unpaid');
 elsif p_action='paid' then
  if o.payment_status='paid' then return; end if;
  update public.orders set payment_status='paid',paid_at=clock_timestamp() where id=p_id;
  insert into public.order_payment_events(order_id,action,previous_status,new_status) values(p_id,'paid',o.payment_status,'paid');
 else raise exception 'INVALID_ACTION'; end if;
end $$;
revoke all on function public.manage_order_payment(uuid,text,timestamptz),public.invalidate_ready_quote(),public.invalidate_item_quote() from public,anon,authenticated;
grant execute on function public.manage_order_payment(uuid,text,timestamptz),public.invalidate_ready_quote(),public.invalidate_item_quote() to service_role;
create index orders_unpaid_quotes on public.orders(mobile_user_id,quote_ready_at desc) where payment_status='unpaid' and quote_ready_at is not null;
