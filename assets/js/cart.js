const cartKey = 'b2b_inquiry_cart';
const productsById = window.PRODUCTS_BY_ID || {};
const cartItems = document.querySelector('[data-cart-page-items]');
const cartCount = document.querySelector('[data-cart-count]');
const inquiryForm = document.querySelector('[data-inquiry-form]');

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function readCart() {
    try {
        return JSON.parse(localStorage.getItem(cartKey)) || {};
    } catch {
        return {};
    }
}

function writeCart(cart) {
    localStorage.setItem(cartKey, JSON.stringify(cart));
}

function cartLineCount(cart = readCart()) {
    return Object.values(cart).reduce((sum, item) => sum + item.sizes.length, 0);
}

function updateCartCount() {
    cartCount.textContent = String(cartLineCount());
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(Number(value) || 0);
}

function itemQuantity(item) {
    return item.sizes.reduce((sum, size) => sum + (Number(size.quantity) || 0), 0);
}

function buildSizeTags(item) {
    return item.sizes
        .filter((size) => Number(size.quantity) > 0)
        .map((size) => `<span>Size ${escapeHtml(size.size)} × ${escapeHtml(size.quantity)}</span>`)
        .join('');
}

function renderCart() {
    const cart = readCart();
    const entries = Object.values(cart);
    updateCartCount();

    if (!entries.length) {
        cartItems.innerHTML = '<div class="empty-cart-line">Your inquiry cart is empty. <a href="index.php">Back to products</a></div>';
        return;
    }

    const rows = entries.map((item) => {
        const product = productsById[item.product_id] || {};
        const quantity = itemQuantity(item);
        const unitPrice = Number(product.price) || 0;
        const lineTotal = quantity * unitPrice;

        return `
            <article class="cart-product-row" data-cart-product="${escapeHtml(item.product_id)}">
                <div class="cart-thumb">
                    <img src="${escapeHtml(product.primary_image || 'assets/img/sole-black.svg')}" alt="${escapeHtml(item.name)}">
                </div>
                <div class="cart-info">
                    <h2>${escapeHtml(item.name)}</h2>
                    <p>Color: ${escapeHtml(product.color || 'Custom')}</p>
                    <p>Size Range: ${escapeHtml(product.size_range || '')}</p>
                    <p>MOQ: ${escapeHtml(product.moq || '')} ${escapeHtml(product.unit || 'Pairs')}</p>
                    <div class="cart-size-tags">${buildSizeTags(item)}</div>
                </div>
                <div class="cart-total-box">
                    <div class="total-line"><span>Total Quantity</span><strong>${escapeHtml(quantity)} ${escapeHtml(product.unit || 'Pairs')}</strong></div>
                    <div class="total-line"><span>Unit Price</span><strong>${formatCurrency(unitPrice)}</strong></div>
                    <div class="total-line grand-total"><span>Total</span><strong>${formatCurrency(lineTotal)}</strong></div>
                    <button class="delete-button" type="button" data-remove-cart="${escapeHtml(item.product_id)}">🗑 Remove</button>
                </div>
            </article>
        `;
    }).join('');

    const totalQuantity = entries.reduce((sum, item) => sum + itemQuantity(item), 0);
    const totalAmount = entries.reduce((sum, item) => {
        const product = productsById[item.product_id] || {};
        return sum + itemQuantity(item) * (Number(product.price) || 0);
    }, 0);

    cartItems.innerHTML = `${rows}
        <div class="cart-summary-row">
            <span>Total Items: <strong>${escapeHtml(totalQuantity)}</strong></span>
            <span>Estimated Total: <strong>${formatCurrency(totalAmount)}</strong></span>
            <small>We will confirm product availability as soon as possible. Shipping costs will be included in our reply email.</small>
        </div>`;
}

document.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove-cart]');

    if (!remove) {
        return;
    }

    const cart = readCart();
    delete cart[remove.dataset.removeCart];
    writeCart(cart);
    renderCart();
});

inquiryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const cart = readCart();

    if (!Object.keys(cart).length) {
        alert('Your inquiry cart is empty.');
        return;
    }

    const payload = {
        customer: Object.fromEntries(new FormData(inquiryForm).entries()),
        items: Object.values(cart),
    };

    const response = await fetch('api/inquiry.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!result.ok) {
        alert(result.message || 'Failed to submit inquiry.');
        return;
    }

    localStorage.removeItem(cartKey);
    renderCart();
    inquiryForm.reset();
    alert('Inquiry submitted successfully.');
});

renderCart();
