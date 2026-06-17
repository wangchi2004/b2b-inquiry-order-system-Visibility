INSERT INTO categories (id, name, slug, sort_order, is_active) VALUES
(1, 'Shoe Soles', 'shoe-soles', 1, 1),
(8, 'Mesh', 'mesh', 2, 1),
(2, 'Rubber Sheets', 'rubber-sheets', 3, 1),
(3, 'Accessories', 'accessories', 4, 1),
(4, 'Leather Chemicals', 'leather-chemicals', 5, 1),
(5, 'Insoles', 'insoles', 6, 1),
(6, 'Shoe Repair Tools', 'shoe-repair-tools', 7, 1),
(7, 'Shoelaces', 'shoelaces', 8, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order), is_active = VALUES(is_active);

INSERT INTO products (id, category_id, name, slug, sku, color, moq, price, unit, size_range, short_description, sort_order, is_active) VALUES
(1, 1, 'Vibram 132 Sole', 'vibram-132-sole', 'SOLE-132-BLK', 'Black', 10, 8.50, 'Pairs', '36 - 46', 'Durable professional outsole for shoe repair.', 1, 1),
(2, 1, 'Vibram 2021 Sole', 'vibram-2021-sole', 'SOLE-2021-BRN', 'Brown', 10, 7.80, 'Pairs', '38 - 45', 'Brown replacement sole for wholesale repair shops.', 2, 1),
(3, 1, 'Vibram Gumlite Sole', 'vibram-gumlite-sole', 'SOLE-GUMLITE-BLK', 'Black', 10, 9.20, 'Pairs', '39 - 47', 'Lightweight black outsole with strong grip pattern.', 3, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), color = VALUES(color), moq = VALUES(moq), price = VALUES(price), size_range = VALUES(size_range), short_description = VALUES(short_description);

INSERT INTO product_sizes (product_id, size_label, sort_order, is_active) VALUES
(1, '36', 1, 1), (1, '37', 2, 1), (1, '38', 3, 1), (1, '39', 4, 1), (1, '40', 5, 1), (1, '41', 6, 1), (1, '42', 7, 1), (1, '43', 8, 1), (1, '44', 9, 1), (1, '45', 10, 1), (1, '46', 11, 1),
(2, '38', 1, 1), (2, '39', 2, 1), (2, '40', 3, 1), (2, '41', 4, 1), (2, '42', 5, 1), (2, '43', 6, 1), (2, '44', 7, 1), (2, '45', 8, 1),
(3, '39', 1, 1), (3, '40', 2, 1), (3, '41', 3, 1), (3, '42', 4, 1), (3, '43', 5, 1), (3, '44', 6, 1), (3, '45', 7, 1), (3, '46', 8, 1), (3, '47', 9, 1)
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order), is_active = VALUES(is_active);

INSERT INTO product_images (id, product_id, image_url, alt_text, is_primary, sort_order) VALUES
(1, 1, 'assets/img/sole-black.svg', 'Vibram 132 Sole black outsole', 1, 1),
(2, 1, 'uploads/products/vibram-132-1.jpg', 'Vibram 132 Sole detail image 1', 0, 2),
(3, 1, 'uploads/products/vibram-132-2.jpg', 'Vibram 132 Sole detail image 2', 0, 3),
(4, 2, 'assets/img/sole-brown.svg', 'Vibram 2021 Sole brown outsole', 1, 1),
(5, 2, 'uploads/products/vibram-2021-1.jpg', 'Vibram 2021 Sole detail image 1', 0, 2),
(6, 2, 'uploads/products/vibram-2021-2.jpg', 'Vibram 2021 Sole detail image 2', 0, 3),
(7, 3, 'assets/img/sole-black.svg', 'Vibram Gumlite Sole black outsole', 1, 1),
(8, 3, 'uploads/products/vibram-gumlite-1.jpg', 'Vibram Gumlite Sole detail image 1', 0, 2),
(9, 3, 'uploads/products/vibram-gumlite-2.jpg', 'Vibram Gumlite Sole detail image 2', 0, 3)
ON DUPLICATE KEY UPDATE image_url = VALUES(image_url), alt_text = VALUES(alt_text), is_primary = VALUES(is_primary), sort_order = VALUES(sort_order);
