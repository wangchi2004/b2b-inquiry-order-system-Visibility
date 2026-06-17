<?php

require_once __DIR__ . '/lib/catalog.php';

$categories = loadCategories();
$products = loadProducts();
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Professional Shoe Repair Materials Supplier</title>
    <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body>
    <header class="site-header">
        <a class="brand" href="index.php">
            <h1>Professional Shoe Repair<br>Materials Supplier</h1>
            <p>Global Wholesale Supplier</p>
        </a>
        <div class="header-actions">
            <button class="language" type="button">🌐 English⌄</button>
            <a class="cart-button" href="cart.php">🛒 Inquiry Cart (<span data-cart-count>0</span>)</a>
        </div>
    </header>

    <main class="layout">
        <aside class="sidebar">
            <nav class="category-list" aria-label="Product categories">
                <?php foreach ($categories as $index => $category): ?>
                    <button
                        class="category-item <?= $index === 0 ? 'active' : '' ?>"
                        type="button"
                        data-category="<?= htmlspecialchars($category['slug']) ?>"
                        data-category-name="<?= htmlspecialchars($category['name']) ?>"
                    >
                        <span class="category-icon"><?= ['👞', '▧', '🧴', '⚗', '🥾', '🛠'][$index] ?? '◇' ?></span>
                        <?= htmlspecialchars($category['name']) ?>
                    </button>
                <?php endforeach; ?>
            </nav>

            <section class="help-card">
                <h2>Need Help?</h2>
                <p>If you can’t find what you need, please contact us.</p>
                <a href="mailto:chi@chinashoerepairmaterials.com">✉ Contact Us</a>
            </section>
        </aside>

        <section class="content">
            <div class="breadcrumbs">Home <span>›</span> <strong data-current-category><?= htmlspecialchars($categories[0]['name'] ?? 'Products') ?></strong></div>

            <div class="toolbar">
                <form class="search" data-search-form>
                    <input type="search" placeholder="Search products..." data-search-input>
                    <button type="submit">Search</button>
                </form>
                <select data-sort>
                    <option value="popular">Sort by: Popular</option>
                    <option value="name">Sort by: Name</option>
                    <option value="moq">Sort by: MOQ</option>
                </select>
            </div>

            <p class="result-count">Showing 1 – <span data-result-count><?= count($products) ?></span> of <span data-total-count><?= count($products) ?></span> products</p>

            <div class="product-list" data-product-list>
                <?php foreach ($products as $product): ?>
                    <?php
                        $category = array_values(array_filter($categories, fn ($item) => (int) $item['id'] === (int) $product['category_id']))[0] ?? $categories[0];
                        $sizes = $product['sizes'] ?: [];
                    ?>
                    <article
                        class="product-card"
                        data-product
                        data-id="<?= (int) $product['id'] ?>"
                        data-category="<?= htmlspecialchars($category['slug']) ?>"
                        data-name="<?= htmlspecialchars(strtolower($product['name'])) ?>"
                        data-moq="<?= (int) $product['moq'] ?>"
                        data-product-json="<?= htmlspecialchars(json_encode($product, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), ENT_QUOTES) ?>"
                    >
                        <div class="product-media">
                            <img src="<?= htmlspecialchars($product['primary_image']) ?>" alt="<?= htmlspecialchars($product['name']) ?>">
                            <button type="button" class="details-button">View Details</button>
                        </div>

                        <div class="product-info">
                            <h2><?= htmlspecialchars($product['name']) ?></h2>
                            <p class="meta">
                                Color: <?= htmlspecialchars($product['color'] ?: 'Custom') ?>
                                <span>|</span>
                                MOQ: <?= (int) $product['moq'] ?> <?= htmlspecialchars($product['unit'] ?: 'Pairs') ?>
                            </p>
                            <p class="meta">Size Range: <?= htmlspecialchars($product['size_range'] ?: implode(' - ', [reset($sizes), end($sizes)])) ?></p>
                            <p class="description"><?= htmlspecialchars($product['short_description'] ?: '') ?></p>
                        </div>

                        <div class="size-panel">
                            <h3>Select Quantity (<?= htmlspecialchars($product['unit'] ?: 'Pairs') ?>) by Size</h3>
                            <div class="size-grid">
                                <?php foreach ($sizes as $size): ?>
                                    <div class="size-stepper" data-size="<?= htmlspecialchars($size) ?>">
                                        <strong><?= htmlspecialchars($size) ?></strong>
                                        <div>
                                            <button type="button" data-qty-minus>-</button>
                                            <span data-qty>0</span>
                                            <button type="button" data-qty-plus>+</button>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                            <button type="button" class="add-button" data-add-cart>Add to Inquiry Cart</button>
                        </div>
                    </article>
                <?php endforeach; ?>
            </div>
        </section>
    </main>

    <div class="detail-modal" data-detail-modal hidden>
        <div class="detail-backdrop" data-close-detail></div>
        <section class="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <button class="detail-close" type="button" data-close-detail aria-label="Close details">×</button>
            <div class="detail-gallery">
                <button class="detail-nav" type="button" data-detail-prev aria-label="Previous image">‹</button>
                <img src="" alt="" data-detail-image>
                <button class="detail-nav" type="button" data-detail-next aria-label="Next image">›</button>
                <div class="detail-counter" data-detail-counter>1 / 1</div>
            </div>
            <div class="detail-content">
                <h2 id="detail-title" data-detail-title></h2>
                <p class="meta" data-detail-meta></p>
                <p class="meta" data-detail-size></p>
                <p class="description" data-detail-description></p>
                <button class="details-button" type="button" data-close-detail>Back to Products</button>
            </div>
        </section>
    </div>

    <div class="toast" data-toast hidden>Added to Inquiry Cart</div>
    <script src="assets/js/app.js"></script>
</body>
</html>
