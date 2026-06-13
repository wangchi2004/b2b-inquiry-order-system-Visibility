insert into products (name, slug, category, description, image_url, material, color, status)
values
  ('AF1 Replacement Sole White', 'af1-replacement-sole-white', 'Sneaker Soles', 'White replacement sole for AF1-style sneaker repair.', '/products/af1-replacement-sole-white.png', 'Rubber', 'White', 'active'),
  ('Rubber Sheet Black', 'rubber-sheet-black', 'Rubber Sheets', 'Black rubber sheet for outsole patching and shoe repair cutting.', '/products/rubber-sheet-black.png', 'Rubber', 'Black', 'active'),
  ('Heel Rubber', 'heel-rubber', 'Heel Materials', 'Durable heel rubber material for shoe heel replacement.', '/products/heel-rubber.png', 'Rubber', 'Black', 'active'),
  ('Shoe Repair Glue', 'shoe-repair-glue', 'Adhesives & Chemicals', 'Strong adhesive for bonding soles, heels, and repair patches.', '/products/shoe-repair-glue.png', 'Adhesive', 'Clear', 'active'),
  ('Insole Material', 'insole-material', 'Insole Materials', 'Sheet material for custom shoe insole repair and replacement.', '/products/insole-material.png', 'EVA', 'Beige', 'active')
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  image_url = excluded.image_url,
  material = excluded.material,
  color = excluded.color,
  status = excluded.status,
  updated_at = now();

insert into product_variants (product_id, sku, size, color, unit, price, stock_status)
values
  ((select id from products where slug = 'af1-replacement-sole-white'), 'AF1-SOLE-WHT-40', '40', 'White', 'pair', 9.80, 'in_stock'),
  ((select id from products where slug = 'af1-replacement-sole-white'), 'AF1-SOLE-WHT-41', '41', 'White', 'pair', 9.80, 'in_stock'),
  ((select id from products where slug = 'af1-replacement-sole-white'), 'AF1-SOLE-WHT-42', '42', 'White', 'pair', 9.80, 'in_stock'),
  ((select id from products where slug = 'af1-replacement-sole-white'), 'AF1-SOLE-WHT-43', '43', 'White', 'pair', 9.80, 'in_stock'),
  ((select id from products where slug = 'af1-replacement-sole-white'), 'AF1-SOLE-WHT-44', '44', 'White', 'pair', 9.80, 'in_stock'),
  ((select id from products where slug = 'rubber-sheet-black'), 'RUB-SHEET-BLK-3MM', '3mm', 'Black', 'sheet', 6.50, 'in_stock'),
  ((select id from products where slug = 'heel-rubber'), 'HEEL-RUB-BLK-STD', 'Standard', 'Black', 'pair', 4.20, 'in_stock'),
  ((select id from products where slug = 'shoe-repair-glue'), 'GLUE-REPAIR-500ML', '500ml', 'Clear', 'bottle', 3.90, 'in_stock'),
  ((select id from products where slug = 'insole-material'), 'INSOLE-EVA-BGE-SHEET', 'Sheet', 'Beige', 'sheet', 5.60, 'in_stock')
on conflict (sku) do update set
  product_id = excluded.product_id,
  size = excluded.size,
  color = excluded.color,
  unit = excluded.unit,
  price = excluded.price,
  stock_status = excluded.stock_status,
  updated_at = now();
