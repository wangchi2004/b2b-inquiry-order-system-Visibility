<?php

require_once __DIR__ . '/lib/catalog.php';

$productsById = [];
foreach (loadProducts() as $product) {
    $productsById[(int) $product['id']] = $product;
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Inquiry Cart | Professional Shoe Repair Materials Supplier</title>
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

    <main class="cart-page">
        <div class="breadcrumbs">Home <span>›</span> <strong>Inquiry Cart</strong></div>
        <h1 class="page-title">Inquiry Cart</h1>

        <div class="notice">ⓘ This is not a payment. Submit your inquiry and we will contact you with a quotation.</div>

        <section class="cart-table" data-cart-page>
            <div class="cart-table-head">
                <strong>Product Image</strong>
                <strong>Product Information</strong>
                <strong>Quantity & Total</strong>
            </div>
            <div data-cart-page-items></div>
        </section>

        <form class="checkout-form" data-inquiry-form>
            <h2>Your Information</h2>
            <div class="form-grid">
                <label>Name <span>*</span><input name="customer_name" placeholder="Your Name" required></label>
                <label>Email <span>*</span><input name="email" type="email" placeholder="Your Email" required></label>
                <label>Country <span>*</span>
                    <select name="country" required>
                        <option value="">Select your country</option>
                        <option>United States</option>
                        <option>China</option>
                        <option>United Kingdom</option>
                        <option>Germany</option>
                        <option>France</option>
                        <option>Italy</option>
                        <option>Australia</option>
                        <option>Canada</option>
                        <option>Other</option>
                    </select>
                </label>
                <label>City (Optional)<input name="city" placeholder="Your City"></label>
            </div>
            <label>Notes<textarea name="message" placeholder="Tell us anything about your inquiry..."></textarea></label>
            <label>WhatsApp (Optional)<input name="whatsapp" placeholder="Your WhatsApp Number"></label>
            <button class="submit-inquiry" type="submit">✈ Submit Inquiry</button>
        </form>

        <section class="trust-row">
            <div>🛡️ <strong>Secure & Confidential</strong><span>Your information is safe with us.</span></div>
            <div>◷ <strong>Quick Response</strong><span>We will reply within 24 hours.</span></div>
            <div>🎧 <strong>Support</strong><span>Contact us anytime for help.</span></div>
        </section>
    </main>

    <script>
        window.PRODUCTS_BY_ID = <?= json_encode($productsById, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>;
    </script>
    <script src="assets/js/cart.js"></script>
</body>
</html>
