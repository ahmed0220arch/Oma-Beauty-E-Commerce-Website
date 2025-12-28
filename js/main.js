// Main JS

document.addEventListener('DOMContentLoaded', () => {
    loadProducts().then(() => {
        renderNewArrivals();
        updateCartCount();
    });
});

// Format Price
function formatPrice(price) {
    return price.toFixed(3) + ' TND';
}

// Render New Arrivals (Home Page)
function renderNewArrivals() {
    const grid = document.getElementById('new-arrivals-grid');
    if (!grid || !products.length) return;

    const newProducts = products.filter(p => p.isNew).slice(0, 4);

    grid.innerHTML = newProducts.map(product => `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-info">
                <div class="product-brand">${product.brand}</div>
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">${formatPrice(product.price)}</div>
                <button class="btn-add-cart" onclick="addToCart('${product.id}')">Ajouter au panier</button>
            </div>
        </div>
    `).join('');
}

// Cart Logic
function getCart() {
    return JSON.parse(localStorage.getItem('oma_cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('oma_cart', JSON.stringify(cart));
    updateCartCount();
}

async function addToCart(productId) {
    // Wait for auth to be ready, then check if user is logged in
    const loggedIn = await isLoggedInAsync();
    
    if (!loggedIn) {
        if (confirm('Vous devez vous connecter pour ajouter des produits au panier.\n\nVoulez-vous vous connecter maintenant ?')) {
            window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return;
    }
    
    const cart = getCart();
    // Convert to string for comparison (Firebase IDs are strings)
    const product = products.find(p => String(p.id) === String(productId));

    if (!product) {
        alert('Produit indisponible pour le moment.');
        return;
    }

    const existingItem = cart.find(item => String(item.id) === String(productId));

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }

    saveCart(cart);
    alert('Produit ajouté au panier !');
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = count;
}
