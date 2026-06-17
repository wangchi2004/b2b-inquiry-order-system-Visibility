const cartKey = 'b2b_inquiry_cart';
const categoryButtons = document.querySelectorAll('[data-category]');
const products = [...document.querySelectorAll('[data-product]')];
const currentCategory = document.querySelector('[data-current-category]');
const resultCount = document.querySelector('[data-result-count]');
const totalCount = document.querySelector('[data-total-count]');
const searchInput = document.querySelector('[data-search-input]');
const sortSelect = document.querySelector('[data-sort]');
const productList = document.querySelector('[data-product-list]');
const toast = document.querySelector('[data-toast]');
const cartCount = document.querySelector('[data-cart-count]');
const detailModal = document.querySelector('[data-detail-modal]');
const detailImage = document.querySelector('[data-detail-image]');
const detailTitle = document.querySelector('[data-detail-title]');
const detailMeta = document.querySelector('[data-detail-meta]');
const detailSize = document.querySelector('[data-detail-size]');
const detailDescription = document.querySelector('[data-detail-description]');
const detailCounter = document.querySelector('[data-detail-counter]');

let activeCategory = categoryButtons[0]?.dataset.category || '';
let query = '';
let detailImages = [];
let detailImageIndex = 0;

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
    cartCount.textContent = cartLineCount();
}

function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
        toast.hidden = true;
    }, 1800);
}

function updateDetailImage() {
    const image = detailImages[detailImageIndex] || '';
    detailImage.src = image;
    detailImage.alt = detailTitle.textContent;
    detailCounter.textContent = `${detailImageIndex + 1} / ${detailImages.length || 1}`;
}

function openDetail(productCard) {
    const product = JSON.parse(productCard.dataset.productJson || '{}');
    detailImages = product.images?.length ? product.images : [product.primary_image];
    detailImageIndex = 0;
    detailTitle.textContent = product.name || '';
    detailMeta.textContent = `Color: ${product.color || 'Custom'} | MOQ: ${product.moq || ''} ${product.unit || 'Pairs'} | Price: $${Number(product.price || 0).toFixed(2)}`;
    detailSize.textContent = `Size Range: ${product.size_range || (product.sizes || []).join(', ')}`;
    detailDescription.textContent = product.detail_description || product.short_description || '';
    updateDetailImage();
    detailModal.hidden = false;
    document.body.classList.add('modal-open');
}

function closeDetail() {
    detailModal.hidden = true;
    document.body.classList.remove('modal-open');
}

function moveDetailImage(direction) {
    if (!detailImages.length) {
        return;
    }

    detailImageIndex = (detailImageIndex + direction + detailImages.length) % detailImages.length;
    updateDetailImage();
}

function updateProducts() {
    let visibleCount = 0;

    products.forEach((product) => {
        const matchesCategory = product.dataset.category === activeCategory;
        const matchesSearch = product.dataset.name.includes(query);
        const visible = matchesCategory && matchesSearch;
        product.hidden = !visible;
        visibleCount += visible ? 1 : 0;
    });

    resultCount.textContent = String(visibleCount);
    totalCount.textContent = String(products.length);
}

function sortProducts() {
    const sorted = [...products].sort((a, b) => {
        if (sortSelect.value === 'name') {
            return a.dataset.name.localeCompare(b.dataset.name);
        }

        if (sortSelect.value === 'moq') {
            return Number(a.dataset.moq) - Number(b.dataset.moq);
        }

        return Number(a.dataset.id) - Number(b.dataset.id);
    });

    sorted.forEach((product) => productList.appendChild(product));
}

categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
        categoryButtons.forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        activeCategory = button.dataset.category;
        currentCategory.textContent = button.dataset.categoryName;
        updateProducts();
    });
});

document.querySelector('[data-search-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    query = searchInput.value.trim().toLowerCase();
    updateProducts();
});

searchInput.addEventListener('input', () => {
    query = searchInput.value.trim().toLowerCase();
    updateProducts();
});

sortSelect.addEventListener('change', () => {
    sortProducts();
    updateProducts();
});

document.addEventListener('click', (event) => {
    const plus = event.target.closest('[data-qty-plus]');
    const minus = event.target.closest('[data-qty-minus]');
    const add = event.target.closest('[data-add-cart]');
    const detailButton = event.target.closest('.details-button');

    if (plus || minus) {
        const stepper = event.target.closest('[data-size]');
        const qty = stepper.querySelector('[data-qty]');
        qty.textContent = String(Math.max(0, Number(qty.textContent) + (plus ? 1 : -1)));
    }

    if (detailButton && detailButton.closest('[data-product]')) {
        openDetail(detailButton.closest('[data-product]'));
        return;
    }

    if (!add) {
        return;
    }

    const product = event.target.closest('[data-product]');
    const selectedSizes = [...product.querySelectorAll('[data-size]')]
        .map((stepper) => ({
            size: stepper.dataset.size,
            quantity: Number(stepper.querySelector('[data-qty]').textContent),
        }))
        .filter((item) => item.quantity > 0);

    if (!selectedSizes.length) {
        showToast('Please select at least one size quantity.');
        return;
    }

    const cart = readCart();
    cart[product.dataset.id] = {
        product_id: Number(product.dataset.id),
        name: product.querySelector('h2').textContent.trim(),
        sizes: selectedSizes,
    };
    writeCart(cart);
    updateCartCount();
    showToast('Added to Inquiry Cart');
});

document.querySelectorAll('[data-close-detail]').forEach((button) => {
    button.addEventListener('click', closeDetail);
});

document.querySelector('[data-detail-prev]').addEventListener('click', () => moveDetailImage(-1));
document.querySelector('[data-detail-next]').addEventListener('click', () => moveDetailImage(1));

document.addEventListener('keydown', (event) => {
    if (detailModal.hidden) {
        return;
    }

    if (event.key === 'Escape') {
        closeDetail();
    }

    if (event.key === 'ArrowLeft') {
        moveDetailImage(-1);
    }

    if (event.key === 'ArrowRight') {
        moveDetailImage(1);
    }
});

sortProducts();
updateProducts();
updateCartCount();
