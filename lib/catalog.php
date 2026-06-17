<?php

require_once __DIR__ . '/database.php';

function demoCategories(): array
{
    return [
        ['id' => 1, 'name' => 'Shoe Soles', 'slug' => 'shoe-soles'],
        ['id' => 8, 'name' => 'Mesh', 'slug' => 'mesh'],
        ['id' => 2, 'name' => 'Rubber Sheets', 'slug' => 'rubber-sheets'],
        ['id' => 3, 'name' => 'Accessories', 'slug' => 'accessories'],
        ['id' => 4, 'name' => 'Leather Chemicals', 'slug' => 'leather-chemicals'],
        ['id' => 5, 'name' => 'Insoles', 'slug' => 'insoles'],
        ['id' => 6, 'name' => 'Shoe Repair Tools', 'slug' => 'shoe-repair-tools'],
        ['id' => 7, 'name' => 'Shoelaces', 'slug' => 'shoelaces'],
    ];
}

function demoProducts(): array
{
    return [
        [
            'id' => 1,
            'category_id' => 1,
            'name' => 'Vibram 132 Sole',
            'slug' => 'vibram-132-sole',
            'color' => 'Black',
            'moq' => 10,
            'price' => 8.50,
            'unit' => 'Pairs',
            'size_range' => '36 - 46',
            'short_description' => 'Durable professional outsole for shoe repair.',
            'primary_image' => 'assets/img/sole-black.svg',
            'images' => ['assets/img/sole-black.svg', 'assets/img/sole-black.svg', 'assets/img/sole-black.svg'],
            'sizes' => ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
        ],
        [
            'id' => 2,
            'category_id' => 1,
            'name' => 'Vibram 2021 Sole',
            'slug' => 'vibram-2021-sole',
            'color' => 'Brown',
            'moq' => 10,
            'price' => 7.80,
            'unit' => 'Pairs',
            'size_range' => '38 - 45',
            'short_description' => 'Brown replacement sole for wholesale repair shops.',
            'primary_image' => 'assets/img/sole-brown.svg',
            'images' => ['assets/img/sole-brown.svg', 'assets/img/sole-brown.svg', 'assets/img/sole-brown.svg'],
            'sizes' => ['38', '39', '40', '41', '42', '43', '44', '45'],
        ],
        [
            'id' => 3,
            'category_id' => 1,
            'name' => 'Vibram Gumlite Sole',
            'slug' => 'vibram-gumlite-sole',
            'color' => 'Black',
            'moq' => 10,
            'price' => 9.20,
            'unit' => 'Pairs',
            'size_range' => '39 - 47',
            'short_description' => 'Lightweight black outsole with strong grip pattern.',
            'primary_image' => 'assets/img/sole-black.svg',
            'images' => ['assets/img/sole-black.svg', 'assets/img/sole-black.svg', 'assets/img/sole-black.svg'],
            'sizes' => ['39', '40', '41', '42', '43', '44', '45', '46', '47'],
        ],
        [
            'id' => 4,
            'category_id' => 2,
            'name' => 'Rubber Sheet',
            'slug' => 'rubber-sheet-15mm',
            'color' => 'Brown',
            'moq' => 5,
            'price' => 4.50,
            'unit' => 'Sheets',
            'size_range' => '1.5mm',
            'short_description' => 'Wholesale rubber sheet for shoe repair workshops.',
            'primary_image' => 'assets/img/rubber-sheet.svg',
            'images' => ['assets/img/rubber-sheet.svg', 'assets/img/rubber-sheet.svg', 'assets/img/rubber-sheet.svg'],
            'sizes' => ['1.5mm'],
        ],
    ];
}

function loadCategories(): array
{
    $pdo = db();

    if (!$pdo) {
        return demoCategories();
    }

    $stmt = $pdo->query('SELECT id, name, slug FROM categories WHERE is_active = 1 ORDER BY sort_order, name');
    return $stmt->fetchAll() ?: demoCategories();
}

function loadProducts(): array
{
    $pdo = db();

    if (!$pdo) {
        return demoProducts();
    }

    $stmt = $pdo->query(
        "SELECT p.*,
            COALESCE(
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 ORDER BY sort_order LIMIT 1),
                (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1),
                'assets/img/sole-black.svg'
            ) AS primary_image
         FROM products p
         WHERE p.is_active = 1
         ORDER BY p.sort_order, p.id DESC"
    );
    $products = $stmt->fetchAll();

    if (!$products) {
        return demoProducts();
    }

    $sizeStmt = $pdo->prepare('SELECT size_label FROM product_sizes WHERE product_id = ? AND is_active = 1 ORDER BY sort_order, size_label');
    $imageStmt = $pdo->prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order, id');

    foreach ($products as &$product) {
        $sizeStmt->execute([$product['id']]);
        $product['sizes'] = array_column($sizeStmt->fetchAll(), 'size_label');
        $imageStmt->execute([$product['id']]);
        $product['images'] = array_column($imageStmt->fetchAll(), 'image_url') ?: [$product['primary_image']];
    }

    return $products;
}

function findProductById(int $productId): ?array
{
    foreach (loadProducts() as $product) {
        if ((int) $product['id'] === $productId) {
            return $product;
        }
    }

    return null;
}
