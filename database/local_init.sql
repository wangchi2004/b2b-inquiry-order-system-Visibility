CREATE DATABASE IF NOT EXISTS u959101359_product_info
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE u959101359_product_info;

CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  sku VARCHAR(80),
  color VARCHAR(80),
  moq INT DEFAULT 10,
  price DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(30) DEFAULT 'Pairs',
  size_range VARCHAR(50),
  short_description TEXT,
  detail_description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_category (category_id),
  INDEX idx_products_active_sort (is_active, sort_order),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_sizes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  size_label VARCHAR(20) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  UNIQUE KEY uq_product_size (product_id, size_label),
  INDEX idx_product_sizes_product (product_id),
  CONSTRAINT fk_product_sizes_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  alt_text VARCHAR(150),
  is_primary TINYINT(1) DEFAULT 0,
  sort_order INT DEFAULT 0,
  INDEX idx_product_images_product (product_id),
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inquiries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(120),
  email VARCHAR(150),
  company VARCHAR(150),
  phone VARCHAR(50),
  message TEXT,
  status VARCHAR(30) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inquiries_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inquiry_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inquiry_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  size_label VARCHAR(20),
  quantity INT NOT NULL DEFAULT 1,
  INDEX idx_inquiry_items_inquiry (inquiry_id),
  INDEX idx_inquiry_items_product (product_id),
  CONSTRAINT fk_inquiry_items_inquiry FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE,
  CONSTRAINT fk_inquiry_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SOURCE database/seed.sql;
