-- Service-only, atomic catalog additions to an existing editable order.
create or replace function public.admin_add_order_catalog_item(p_order uuid,p_variant uuid,p_quantity integer,p_version timestamptz)
returns void language plpgsql security invoker set search_path='' as $$
declare o public.orders%rowtype; v public.product_variants%rowtype; p public.products%rowtype; subtotal numeric; total numeric;
begin
 select * into o from public.orders where id=p_order for update;
 if not found or o.payment_status='paid' or o.status not in ('new','submitted','quoted','confirmed') then raise exception 'ORDER_LOCKED'; end if;
 if o.quote_updated_at is distinct from p_version then raise exception 'ORDER_CHANGED'; end if;
 if p_quantity is null or p_quantity<1 or p_quantity>100000 then raise exception 'INVALID_QUANTITY'; end if;
 select * into v from public.product_variants where id=p_variant for share;
 if not found or v.price is null or v.price<0 then raise exception 'VARIANT_UNAVAILABLE'; end if;
 select * into p from public.products where id=v.product_id for share;
 if not found or p.status<>'active' then raise exception 'PRODUCT_UNAVAILABLE'; end if;
 -- Keep existing negotiated lines unchanged, including identical variants.
 insert into public.order_items(order_id,product_id,variant_id,product_name,sku,size,color,quantity,unit,unit_price)
 values(p_order,p.id,v.id,p.name,v.sku,v.size,v.color,p_quantity,v.unit,v.price);
 select case when count(*)=count(unit_price) then sum(quantity*unit_price) else null end into subtotal from public.order_items where order_id=p_order;
 total:=subtotal+coalesce(o.shipping_fee,0);
 update public.orders set product_subtotal=subtotal,grand_total=total,
 paypal_fee=round(total*0.05,2),paypal_collection=total+round(total*0.05,2),
 quote_updated_at=clock_timestamp(),quote_ready_at=null,status='new',updated_at=clock_timestamp()
 where id=p_order;
end $$;
revoke all on function public.admin_add_order_catalog_item(uuid,uuid,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_add_order_catalog_item(uuid,uuid,integer,timestamptz) to service_role;
