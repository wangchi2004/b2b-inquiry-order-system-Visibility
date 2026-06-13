alter table orders
  add column if not exists inquiry_image_url_1 text,
  add column if not exists inquiry_image_url_2 text,
  add column if not exists inquiry_image_url_3 text;
