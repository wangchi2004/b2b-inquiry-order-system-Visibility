alter table order_items
  alter column product_id drop not null;

alter table order_items
  drop constraint if exists order_items_product_id_fkey;

alter table order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id)
  references products(id)
  on delete set null;

grant select, insert, update, delete on order_items to service_role;
