create or replace function public.manage_order_payment(p_id uuid,p_action text,p_version timestamptz default null) returns void language plpgsql security invoker set search_path='' as $$
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
  if p_version is null or o.quote_updated_at is distinct from p_version or o.grand_total is null then raise exception 'QUOTE_CHANGED'; end if;
  update public.orders set payment_status='paid',paid_at=clock_timestamp() where id=p_id;
  insert into public.order_payment_events(order_id,action,previous_status,new_status) values(p_id,'paid',o.payment_status,'paid');
 else raise exception 'INVALID_ACTION'; end if;
end $$;

create or replace function public.invalidate_ready_quote() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.product_subtotal,new.shipping_fee,new.grand_total,new.paypal_fee,new.paypal_collection,new.quote_updated_at) is distinct from (old.product_subtotal,old.shipping_fee,old.grand_total,old.paypal_fee,old.paypal_collection,old.quote_updated_at) then
  if old.payment_status='paid' then raise exception 'PAID_ORDER_LOCKED'; end if;
  new.quote_ready_at:=null;
 end if;
 return new;
end $$;
create function public.protect_paid_order_items() returns trigger language plpgsql security invoker set search_path='' as $$
declare payment text; target uuid;
begin
 if TG_OP='DELETE' then target:=old.order_id; else target:=new.order_id; end if;
 select payment_status into payment from public.orders where id=target for update;
 if payment='paid' then raise exception 'PAID_ORDER_LOCKED'; end if;
 if TG_OP='DELETE' then return old; else return new; end if;
end $$;
create trigger protect_paid_order_items before insert or update or delete on public.order_items for each row execute function public.protect_paid_order_items();
revoke all on function public.protect_paid_order_items() from public,anon,authenticated;
grant execute on function public.protect_paid_order_items() to service_role;
