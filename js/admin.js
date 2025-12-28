// Admin dashboard logic with Firebase

let authReady = false;

// Wait for Firebase auth to initialize
auth.onAuthStateChanged((user) => {
  authReady = true;
  if (!isAdminLoggedIn()) {
    window.location.href = 'admin-login.html';
    return;
  }
  
  // Only load data once auth is ready
  if (!document.getElementById('admin-users').innerHTML) {
    loadAdminData();
    
    // Refresh data every 10 seconds
    setInterval(loadAdminData, 10000);
  }
});

// Check if admin is authenticated
function isAdminLoggedIn() {
  const adminSession = localStorage.getItem('oma_admin');
  return adminSession !== null && auth.currentUser !== null;
}

// Handle admin logout
async function handleLogout() {
  if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
    localStorage.removeItem('oma_admin');
    await auth.signOut();
    window.location.href = 'admin-login.html';
  }
}

async function loadAdminData() {
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get products
    const productsSnapshot = await db.collection('products').get();
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get orders
    const ordersSnapshot = await db.collection('orders').get();
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Calculate stats
    const stats = {
      users: users.length,
      products: products.length,
      orders: orders.length,
      revenue: orders.reduce((sum, order) => sum + (order.total || 0), 0)
    };
    
    const data = {
      stats,
      users,
      products,
      orders
    };
    
    renderAdmin(data);
  } catch (error) {
    console.error('Error loading admin data:', error);
    // Show fallback data
    renderAdmin({
      stats: { users: 0, products: 0, orders: 0, revenue: 0 },
      users: [],
      products: [],
      orders: []
    });
  }
}

function renderAdmin(data) {
  const { stats, users, products, orders } = data;
  
  // Update stats
  document.getElementById('stat-users').textContent = stats?.users ?? '0';
  document.getElementById('stat-products').textContent = stats?.products ?? '0';
  document.getElementById('stat-orders').textContent = stats?.orders ?? '0';
  document.getElementById('stat-revenue').textContent = stats?.revenue ? formatPrice(stats.revenue) : '0.000 TND';

  // Render all users
  const usersBody = document.getElementById('admin-users');
  if (users && users.length > 0) {
    usersBody.innerHTML = users.map((u, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${u.name || '-'}</td>
        <td>${u.email || '-'}</td>
        <td>${u.role || 'client'}</td>
        <td>${formatTimestamp(u.createdAt)}</td>
      </tr>
    `).join('');
  } else {
    usersBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucun utilisateur</td></tr>';
  }

  // Render products with edit/delete buttons
  const productsBody = document.getElementById('admin-products');
  if (products && products.length > 0) {
    productsBody.innerHTML = products.map((p) => `
      <tr>
        <td><img src="${p.image || 'assets/placeholder.jpg'}" alt="${p.name}" style="width:50px; height:50px; object-fit:cover; border-radius:6px;"></td>
        <td>${p.name || '-'}</td>
        <td>${p.brand || '-'}</td>
        <td>${p.category || '-'}</td>
        <td>${formatPrice(p.price)}</td>
        <td>${p.stock || 0} pcs</td>
        <td>
          <button class="btn-edit" onclick="openEditProductModal('${p.id}')"><i class="fa-solid fa-pen"></i> Modifier</button>
          <button class="btn-delete" onclick="openDeleteModal('${p.id}')"><i class="fa-solid fa-trash"></i> Supprimer</button>
        </td>
      </tr>
    `).join('');
  } else {
    productsBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Aucun produit. Cliquez sur "Ajouter un produit" pour commencer.</td></tr>';
  }

  // Render orders
  const ordersBody = document.getElementById('admin-orders');
  if (orders && orders.length > 0) {
    ordersBody.innerHTML = orders.map((o, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${o.userName || o.userEmail || '-'}</td>
        <td>${formatPrice(o.total)}</td>
        <td><span class="status ${o.status || 'pending'}">${o.status || 'pending'}</span></td>
        <td>${formatTimestamp(o.createdAt)}</td>
      </tr>
    `).join('');
  } else {
    ordersBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucune commande</td></tr>';
  }
}

function formatPrice(value) {
  const num = Number(value) || 0;
  return num.toFixed(3) + ' TND';
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '-';
  
  // Handle Firestore Timestamp
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate().toLocaleString('fr-TN');
  }
  
  // Handle regular date string or Date object
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleString('fr-TN');
}

// ==========================================
// PRODUCT MANAGEMENT - CRUD OPERATIONS
// ==========================================

let productToDelete = null;
let allProducts = []; // Store products for editing

// Store products when loading
async function loadAdminDataWithProducts() {
  const productsSnapshot = await db.collection('products').get();
  allProducts = productsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  return allProducts;
}

// Open Add Product Modal
function openAddProductModal() {
  document.getElementById('modal-title').textContent = 'Ajouter un produit';
  document.getElementById('product-form').reset();
  document.getElementById('product-id').value = '';
  document.getElementById('product-image-url').value = '';
  document.getElementById('image-preview').style.display = 'none';
  document.getElementById('submit-btn').innerHTML = '<i class="fa-solid fa-plus"></i> Ajouter';
  document.getElementById('product-modal').classList.add('show');
}

// Preview image when file selected
function previewImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('preview-img').src = e.target.result;
      document.getElementById('image-preview').style.display = 'block';
      document.getElementById('current-image-text').textContent = 'Nouvelle image: ' + file.name;
    };
    reader.readAsDataURL(file);
  }
}

// Open Edit Product Modal
async function openEditProductModal(productId) {
  try {
    // Get product from Firestore
    const productDoc = await db.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      alert('Produit non trouvé');
      return;
    }
    
    const product = productDoc.data();
    
    document.getElementById('modal-title').textContent = 'Modifier le produit';
    document.getElementById('product-id').value = productId;
    document.getElementById('product-name').value = product.name || '';
    document.getElementById('product-brand').value = product.brand || '';
    document.getElementById('product-category').value = product.category || '';
    document.getElementById('product-price').value = product.price || '';
    document.getElementById('product-stock').value = product.stock || 0;
    document.getElementById('product-image-url').value = product.image || '';
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-new').checked = product.isNew || false;
    document.getElementById('submit-btn').innerHTML = '<i class="fa-solid fa-save"></i> Enregistrer les modifications';
    
    // Show current image preview
    if (product.image) {
      document.getElementById('preview-img').src = product.image;
      document.getElementById('image-preview').style.display = 'block';
      document.getElementById('current-image-text').textContent = 'Image actuelle';
    } else {
      document.getElementById('image-preview').style.display = 'none';
    }
    
    // Clear file input
    document.getElementById('product-image').value = '';
    
    document.getElementById('product-modal').classList.add('show');
  } catch (error) {
    console.error('Error loading product:', error);
    alert('Erreur lors du chargement du produit');
  }
}

// Close Product Modal
function closeModal() {
  document.getElementById('product-modal').classList.remove('show');
}

// Handle Product Form Submit (Add or Edit)
async function handleProductSubmit(event) {
  event.preventDefault();
  
  const productId = document.getElementById('product-id').value;
  const submitBtn = document.getElementById('submit-btn');
  const fileInput = document.getElementById('product-image');
  const existingImageUrl = document.getElementById('product-image-url').value;
  
  // Disable button
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enregistrement...';
  
  try {
    let imageUrl = existingImageUrl;
    
    // If a new file is selected, convert to base64
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      
      // Check file size (max 2MB for Firestore)
      if (file.size > 2 * 1024 * 1024) {
        alert('L\'image est trop grande. Taille maximum: 2MB');
        submitBtn.disabled = false;
        submitBtn.innerHTML = productId ? '<i class="fa-solid fa-save"></i> Enregistrer les modifications' : '<i class="fa-solid fa-plus"></i> Ajouter';
        return;
      }
      
      // Convert to base64
      imageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    
    // Validate image
    if (!imageUrl && !productId) {
      alert('Veuillez sélectionner une image pour le produit');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Ajouter';
      return;
    }
    
    const productData = {
      name: document.getElementById('product-name').value.trim(),
      brand: document.getElementById('product-brand').value.trim(),
      category: document.getElementById('product-category').value,
      price: parseFloat(document.getElementById('product-price').value) || 0,
      stock: parseInt(document.getElementById('product-stock').value) || 0,
      image: imageUrl,
      description: document.getElementById('product-description').value.trim(),
      isNew: document.getElementById('product-new').checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (productId) {
      // UPDATE existing product
      await db.collection('products').doc(productId).update(productData);
      alert('Produit modifié avec succès !');
    } else {
      // ADD new product
      productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('products').add(productData);
      alert('Produit ajouté avec succès !');
    }
    
    closeModal();
    loadAdminData(); // Refresh the list
  } catch (error) {
    console.error('Error saving product:', error);
    alert('Erreur lors de l\'enregistrement: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = productId ? '<i class="fa-solid fa-save"></i> Enregistrer les modifications' : '<i class="fa-solid fa-plus"></i> Ajouter';
  }
}

// Open Delete Confirmation Modal
function openDeleteModal(productId) {
  productToDelete = productId;
  document.getElementById('delete-modal').classList.add('show');
}

// Close Delete Modal
function closeDeleteModal() {
  productToDelete = null;
  document.getElementById('delete-modal').classList.remove('show');
}

// Confirm Delete Product
async function confirmDelete() {
  if (!productToDelete) return;
  
  try {
    await db.collection('products').doc(productToDelete).delete();
    alert('Produit supprimé avec succès !');
    closeDeleteModal();
    loadAdminData(); // Refresh the list
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Erreur lors de la suppression: ' + error.message);
  }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('show');
  }
});
