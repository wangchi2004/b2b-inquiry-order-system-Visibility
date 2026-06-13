-- Update existing products from the old flat categories to the new catalog structure.
-- Run this once in Supabase SQL Editor if your live database still has old category names.

update products
set
  category = case
    when category = 'Replacement Soles' then 'Sneaker Soles'
    when category = 'Adhesives' then 'Adhesives & Chemicals'
    when category = 'Insoles' then 'Insole Materials'
    when category = 'Leather' then 'Leather & Linings'
    when category = 'Tools' then 'Tools & Equipment'
    when category = 'Zippers' then 'Shoe Repair Accessories'
    else category
  end,
  updated_at = now()
where category in (
  'Replacement Soles',
  'Adhesives',
  'Insoles',
  'Leather',
  'Tools',
  'Zippers'
);
