<?php

require_once __DIR__ . '/lib/catalog.php';

$pdo = db();
$categories = loadCategories();
$products = $pdo ? $pdo->query(
    "SELECT p.*,
        COALESCE(
            (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 ORDER BY sort_order LIMIT 1),
            (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1),
            'assets/img/sole-black.svg'
        ) AS primary_image,
        COALESCE(
            (SELECT GROUP_CONCAT(size_label ORDER BY sort_order SEPARATOR ', ') FROM product_sizes WHERE product_id = p.id),
            ''
        ) AS size_labels,
        COALESCE(
            (SELECT GROUP_CONCAT(image_url ORDER BY is_primary DESC, sort_order, id SEPARATOR '||') FROM product_images WHERE product_id = p.id),
            ''
        ) AS image_urls
     FROM products p
     ORDER BY p.sort_order, p.id DESC"
)->fetchAll() : [];
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Product Admin | Shoe Repair Materials</title>
    <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body>
    <header class="site-header admin-header">
        <a class="brand" href="index.php">
            <h1>Product Data Admin</h1>
            <p>Upload, edit, and delete local database products</p>
        </a>
        <div class="header-actions">
            <a class="cart-button" href="index.php">View Website</a>
            <a class="cart-button" href="cart.php">Inquiry Cart</a>
        </div>
    </header>

    <main class="admin-page">
        <?php if (!$pdo): ?>
            <div class="notice danger">Database is not connected. Please check <code>config/database.local.php</code>.</div>
        <?php endif; ?>

        <section class="admin-card">
            <div class="admin-card-head">
                <div>
                    <h2 data-form-title>Add Product</h2>
                    <p>Create product records, sizes, and a primary image.</p>
                </div>
                <button class="details-button" type="button" data-reset-form>New Product</button>
            </div>

            <form class="admin-form" data-product-form enctype="multipart/form-data">
                <input type="hidden" name="action" value="save">
                <input type="hidden" name="product_id" data-product-id>
                <div class="form-grid">
                    <label>Product Name *<input name="name" required placeholder="Vibram 132 Sole"></label>
                    <label>Slug<input name="slug" placeholder="vibram-132-sole"></label>
                    <label>Category *
                        <select name="category_id" required>
                            <?php foreach ($categories as $category): ?>
                                <option value="<?= (int) $category['id'] ?>"><?= htmlspecialchars($category['name']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </label>
                    <label>SKU<input name="sku" placeholder="SOLE-132-BLK"></label>
                    <label>Color<input name="color" placeholder="Black"></label>
                    <label>MOQ<input name="moq" type="number" min="1" value="10"></label>
                    <label>Unit Price<input name="price" type="number" min="0" step="0.01" value="0.00" placeholder="8.50"></label>
                    <label>RMB Price<input name="rmb_price" type="number" min="0" step="0.01" value="0.00" placeholder="68.00"></label>
                    <label>Unit<input name="unit" value="Pairs" placeholder="Pairs / Sheets"></label>
                    <label>Size Range<input name="size_range" placeholder="36 - 46"></label>
                    <label>Sort Order<input name="sort_order" type="number" value="0"></label>
                    <label>Status
                        <select name="is_active">
                            <option value="1">Active</option>
                            <option value="0">Hidden</option>
                        </select>
                    </label>
                </div>
                <label>Sizes *<input name="sizes" required placeholder="36, 37, 38, 39, 40"></label>
                <label>Short Description<textarea name="short_description" placeholder="Short product summary"></textarea></label>
                <label>Detail Description<textarea name="detail_description" placeholder="Long product details"></textarea></label>
                <div class="form-grid">
                    <label>Primary Image<input name="primary_image" type="file" accept="image/*"></label>
                    <label>副图1<input name="gallery_image_1" type="file" accept="image/*"></label>
                    <label>副图2<input name="gallery_image_2" type="file" accept="image/*"></label>
                </div>
                <div class="image-preview-grid" data-current-images hidden></div>
                <div class="admin-actions">
                    <button class="submit-inquiry" type="submit">Save Product</button>
                    <button class="details-button" type="button" data-reset-form>Clear</button>
                </div>
            </form>
        </section>

        <section class="admin-card">
            <div class="admin-card-head">
                <div>
                    <h2>Product List</h2>
                    <p>Select products to edit or delete from the local database.</p>
                </div>
                <button class="danger-button" type="button" data-delete-selected>Delete Selected</button>
            </div>

            <div class="admin-table">
                <div class="admin-row admin-row-head">
                    <span><input type="checkbox" data-select-all></span>
                    <span>Image</span>
                    <span>Product</span>
                    <span>Category</span>
                    <span>Sizes</span>
                    <span>Status</span>
                    <span>Actions</span>
                </div>
                <?php foreach ($products as $product): ?>
                    <?php
                        $categoryName = '';
                        foreach ($categories as $category) {
                            if ((int) $category['id'] === (int) $product['category_id']) {
                                $categoryName = $category['name'];
                                break;
                            }
                        }
                    ?>
                    <div class="admin-row" data-admin-product='<?= htmlspecialchars(json_encode($product, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), ENT_QUOTES) ?>'>
                        <span><input type="checkbox" data-select-product value="<?= (int) $product['id'] ?>"></span>
                        <span><img class="admin-thumb" src="<?= htmlspecialchars($product['primary_image']) ?>" alt=""></span>
                        <span>
                            <strong><?= htmlspecialchars($product['name']) ?></strong>
                            <small><?= htmlspecialchars($product['sku'] ?? '') ?></small>
                            <small>$<?= number_format((float) ($product['price'] ?? 0), 2) ?></small>
                            <small>¥<?= number_format((float) ($product['rmb_price'] ?? 0), 2) ?></small>
                            <small><?= $product['image_urls'] ? count(explode('||', $product['image_urls'])) . ' image(s)' : 'No uploaded images' ?></small>
                        </span>
                        <span><?= htmlspecialchars($categoryName) ?></span>
                        <span><?= htmlspecialchars($product['size_labels']) ?></span>
                        <span><?= (int) $product['is_active'] === 1 ? 'Active' : 'Hidden' ?></span>
                        <span class="row-actions">
                            <button type="button" class="details-button" data-edit-product>Edit</button>
                            <button type="button" class="danger-button" data-delete-product="<?= (int) $product['id'] ?>">Delete</button>
                        </span>
                    </div>
                <?php endforeach; ?>
            </div>
        </section>
    </main>

    <div class="toast" data-toast hidden>Saved</div>
    <script src="assets/js/admin.js"></script>
</body>
</html>
