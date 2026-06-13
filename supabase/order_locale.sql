alter table orders
  add column if not exists locale text not null default 'en';

update orders
set locale = 'en'
where locale is null or trim(locale) = '';
