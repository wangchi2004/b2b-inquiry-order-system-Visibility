<?php

require_once __DIR__ . '/../lib/database.php';

header('Content-Type: application/json');

function respond(array $payload): void
{
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function slugify(string $value): string
{
    $slug = strtolower(trim($value));
    $slug = preg_replace('/[^a-z0-9]+/i', '-', $slug);
    $slug = trim((string) $slug, '-');
    return $slug !== '' ? $slug : 'product-' . time();
}

function uploadImage(string $fieldName): ?string
{
    if (empty($_FILES[$fieldName]['tmp_name']) || !is_uploaded_file($_FILES[$fieldName]['tmp_name'])) {
        return null;
    }

    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif', 'image/svg+xml' => 'svg'];
    $mime = mime_content_type($_FILES[$fieldName]['tmp_name']);

    if (!isset($allowed[$mime])) {
        respond(['ok' => false, 'message' => 'Only JPG, PNG, WEBP, GIF, or SVG images are allowed.']);
    }

    $dir = __DIR__ . '/../uploads/products';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    $filename = 'product-' . date('YmdHis') . '-' . bin2hex(random_bytes(4)) . '.' . $allowed[$mime];
    $target = $dir . '/' . $filename;

    if (!move_uploaded_file($_FILES[$fieldName]['tmp_name'], $target)) {
        respond(['ok' => false, 'message' => 'Image upload failed.']);
    }

    return 'uploads/products/' . $filename;
}

function saveProductImage(PDO $pdo, int $productId, string $imageUrl, string $altText, bool $isPrimary, int $sortOrder): void
{
    $pdo->prepare('DELETE FROM product_images WHERE product_id = ? AND sort_order = ?')->execute([$productId, $sortOrder]);

    if ($isPrimary) {
        $pdo->prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?')->execute([$productId]);
    }

    $imageStmt = $pdo->prepare('INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)');
    $imageStmt->execute([$productId, $imageUrl, $altText, $isPrimary ? 1 : 0, $sortOrder]);
}

$pdo = db();
if (!$pdo) {
    respond(['ok' => false, 'message' => 'Database is not connected.']);
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

try {
    if ($action === 'save') {
        $productId = (int) ($_POST['product_id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $slug = slugify($_POST['slug'] ?? $name);
        $categoryId = (int) ($_POST['category_id'] ?? 0);
        $sizes = array_values(array_filter(array_map('trim', explode(',', $_POST['sizes'] ?? ''))));
        $price = max(0, (float) ($_POST['price'] ?? 0));
        $rmbPrice = max(0, (float) ($_POST['rmb_price'] ?? 0));

        if ($name === '' || $categoryId <= 0 || !$sizes) {
            respond(['ok' => false, 'message' => 'Name, category, and sizes are required.']);
        }

        $pdo->beginTransaction();

        if ($productId > 0) {
            $stmt = $pdo->prepare('UPDATE products SET category_id=?, name=?, slug=?, sku=?, color=?, moq=?, price=?, rmb_price=?, unit=?, size_range=?, short_description=?, detail_description=?, is_active=?, sort_order=? WHERE id=?');
            $stmt->execute([$categoryId, $name, $slug, trim($_POST['sku'] ?? ''), trim($_POST['color'] ?? ''), max(1, (int) ($_POST['moq'] ?? 1)), $price, $rmbPrice, trim($_POST['unit'] ?? 'Pairs'), trim($_POST['size_range'] ?? ''), trim($_POST['short_description'] ?? ''), trim($_POST['detail_description'] ?? ''), (int) ($_POST['is_active'] ?? 1), (int) ($_POST['sort_order'] ?? 0), $productId]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO products (category_id, name, slug, sku, color, moq, price, rmb_price, unit, size_range, short_description, detail_description, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([$categoryId, $name, $slug, trim($_POST['sku'] ?? ''), trim($_POST['color'] ?? ''), max(1, (int) ($_POST['moq'] ?? 1)), $price, $rmbPrice, trim($_POST['unit'] ?? 'Pairs'), trim($_POST['size_range'] ?? ''), trim($_POST['short_description'] ?? ''), trim($_POST['detail_description'] ?? ''), (int) ($_POST['is_active'] ?? 1), (int) ($_POST['sort_order'] ?? 0)]);
            $productId = (int) $pdo->lastInsertId();
        }

        $pdo->prepare('DELETE FROM product_sizes WHERE product_id = ?')->execute([$productId]);
        $sizeStmt = $pdo->prepare('INSERT INTO product_sizes (product_id, size_label, sort_order, is_active) VALUES (?, ?, ?, 1)');
        foreach ($sizes as $index => $size) {
            $sizeStmt->execute([$productId, $size, $index + 1]);
        }

        $imageUrl = uploadImage('primary_image');
        if ($imageUrl) {
            saveProductImage($pdo, $productId, $imageUrl, $name, true, 1);
        }

        $galleryImage1 = uploadImage('gallery_image_1');
        if ($galleryImage1) {
            saveProductImage($pdo, $productId, $galleryImage1, $name . ' detail image 1', false, 2);
        }

        $galleryImage2 = uploadImage('gallery_image_2');
        if ($galleryImage2) {
            saveProductImage($pdo, $productId, $galleryImage2, $name . ' detail image 2', false, 3);
        }

        $pdo->commit();
        respond(['ok' => true, 'message' => 'Product saved.']);
    }

    if ($action === 'delete') {
        $ids = $_POST['ids'] ?? [];
        if (is_string($ids)) {
            $ids = explode(',', $ids);
        }
        $ids = array_values(array_filter(array_map('intval', $ids)));

        if (!$ids) {
            respond(['ok' => false, 'message' => 'No products selected.']);
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $pdo->prepare("DELETE FROM inquiry_items WHERE product_id IN ($placeholders)")->execute($ids);
        $pdo->prepare("DELETE FROM product_images WHERE product_id IN ($placeholders)")->execute($ids);
        $pdo->prepare("DELETE FROM product_sizes WHERE product_id IN ($placeholders)")->execute($ids);
        $stmt = $pdo->prepare("DELETE FROM products WHERE id IN ($placeholders)");
        $stmt->execute($ids);
        respond(['ok' => true, 'message' => 'Selected products deleted.']);
    }

    respond(['ok' => false, 'message' => 'Unknown action.']);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(['ok' => false, 'message' => 'Database error: ' . $error->getMessage()]);
}
