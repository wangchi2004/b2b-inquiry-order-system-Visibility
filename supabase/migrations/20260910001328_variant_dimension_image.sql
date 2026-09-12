begin;
alter table public.product_variants add column if not exists dimension_image_url text;
comment on column public.product_variants.dimension_image_url is
  'Optional original-resolution dimension reference image for this specification. Independent of the three product gallery images; displayed images are not life-size.';
commit;
