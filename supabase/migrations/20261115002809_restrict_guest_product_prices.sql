-- Allow anonymous product browsing without exposing wholesale prices.
revoke select on public.product_variants from anon, public;
revoke select (price) on public.product_variants from anon, public;
grant select (id,product_id,sku,size,color,unit,stock_status,created_at,updated_at,dimension_image_url)
  on public.product_variants to anon;
