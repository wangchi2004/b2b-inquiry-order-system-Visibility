const form = document.querySelector('[data-product-form]');
const toast = document.querySelector('[data-toast]');
const selectAll = document.querySelector('[data-select-all]');
const currentImages = document.querySelector('[data-current-images]');
const selectedProducts = () => [...document.querySelectorAll('[data-select-product]:checked')].map((input) => input.value);

function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
        toast.hidden = true;
    }, 2000);
}

function resetForm() {
    form.reset();
    form.querySelector('[data-product-id]').value = '';
    currentImages.hidden = true;
    currentImages.innerHTML = '';
    document.querySelector('[data-form-title]').textContent = 'Add Product';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function showCurrentImages(product) {
    const labels = ['Primary Image', '副图1', '副图2'];
    const images = product.image_urls ? product.image_urls.split('||').filter(Boolean) : [];

    currentImages.hidden = false;
    currentImages.innerHTML = images.length
        ? images.map((image, index) => `
            <div class="image-preview-card">
                <strong>${escapeHtml(labels[index] || `Image ${index + 1}`)}</strong>
                <img src="${escapeHtml(image)}" alt="">
                <small>${escapeHtml(image)}</small>
            </div>
        `).join('')
        : '<p>No uploaded images saved for this product yet.</p>';
}

async function deleteProducts(ids) {
    if (!ids.length) {
        alert('Please select at least one product.');
        return;
    }

    if (!confirm(`Delete ${ids.length} product(s)? This cannot be undone.`)) {
        return;
    }

    const body = new FormData();
    body.append('action', 'delete');
    ids.forEach((id) => body.append('ids[]', id));

    const response = await fetch('api/admin_product.php', { method: 'POST', body });
    const result = await response.json();

    if (!result.ok) {
        alert(result.message || 'Delete failed.');
        return;
    }

    showToast(result.message || 'Deleted.');
    window.setTimeout(() => window.location.reload(), 650);
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const response = await fetch('api/admin_product.php', {
        method: 'POST',
        body: new FormData(form),
    });
    const result = await response.json();

    if (!result.ok) {
        alert(result.message || 'Save failed.');
        return;
    }

    showToast(result.message || 'Saved.');
    window.setTimeout(() => window.location.reload(), 650);
});

document.querySelectorAll('[data-reset-form]').forEach((button) => {
    button.addEventListener('click', resetForm);
});

document.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-product]');
    const deleteButton = event.target.closest('[data-delete-product]');

    if (editButton) {
        const product = JSON.parse(editButton.closest('[data-admin-product]').dataset.adminProduct);
        form.product_id.value = product.id || '';
        form.name.value = product.name || '';
        form.slug.value = product.slug || '';
        form.category_id.value = product.category_id || '';
        form.sku.value = product.sku || '';
        form.color.value = product.color || '';
        form.moq.value = product.moq || 1;
        form.price.value = product.price || 0;
        form.rmb_price.value = product.rmb_price || 0;
        form.unit.value = product.unit || 'Pairs';
        form.size_range.value = product.size_range || '';
        form.sort_order.value = product.sort_order || 0;
        form.is_active.value = product.is_active || 0;
        form.sizes.value = product.size_labels || '';
        form.short_description.value = product.short_description || '';
        form.detail_description.value = product.detail_description || '';
        showCurrentImages(product);
        document.querySelector('[data-form-title]').textContent = `Edit Product #${product.id}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (deleteButton) {
        deleteProducts([deleteButton.dataset.deleteProduct]);
    }
});

document.querySelector('[data-delete-selected]').addEventListener('click', () => {
    deleteProducts(selectedProducts());
});

selectAll?.addEventListener('change', () => {
    document.querySelectorAll('[data-select-product]').forEach((checkbox) => {
        checkbox.checked = selectAll.checked;
    });
});
