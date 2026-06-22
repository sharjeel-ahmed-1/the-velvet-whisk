// State Management
let menuItems = [];
let cart = [];
let customerProfile = null;
let currentRatingInput = 5;
let activeDetailItem = null;
let activeDetailQty = 1;
let pendingDirectOrder = null;

// DOM Elements
const menuGrid = document.getElementById('menu-grid');
const filterBtns = document.querySelectorAll('.filter-btn');
const cartBtn = document.getElementById('cart-btn');
const cartCountBadge = document.querySelector('.cart-count');
const cartDialog = document.getElementById('cart-dialog');
const profileDialog = document.getElementById('profile-dialog');
const successDialog = document.getElementById('success-dialog');

// Item Detail Modal Elements
const detailDialog = document.getElementById('detail-dialog');
const detailItemName = document.getElementById('detail-item-name');
const detailItemImage = document.getElementById('detail-item-image');
const detailItemFlavor = document.getElementById('detail-item-flavor');
const detailItemDesc = document.getElementById('detail-item-desc');
const detailItemPrice = document.getElementById('detail-item-price');
const detailQtyInput = document.getElementById('detail-qty-input');
const detailQtyMinus = document.getElementById('detail-qty-minus');
const detailQtyPlus = document.getElementById('detail-qty-plus');
const detailConfirmBtn = document.getElementById('detail-confirm-btn');

// Cart Drawer Elements
const cartEmptyMsg = document.getElementById('cart-empty-message');
const cartContentWrapper = document.getElementById('cart-content-wrapper');
const cartItemsList = document.getElementById('cart-items-list');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartDeliveryFeeEl = document.getElementById('cart-delivery-fee');
const cartGrandTotalEl = document.getElementById('cart-grand-total');
const prefDelivery = document.getElementById('pref-delivery');
const prefPickup = document.getElementById('pref-pickup');
const summaryDeliveryAddress = document.getElementById('summary-delivery-address');
const checkoutBtn = document.getElementById('checkout-btn');

// Profile Summary in Cart
const activeProfileSummary = document.getElementById('active-profile-summary');
const summaryProfileName = document.getElementById('summary-profile-name');
const summaryProfilePhone = document.getElementById('summary-profile-phone');
const editProfileBtn = document.getElementById('edit-profile-btn');

// Review Form Elements
const reviewForm = document.getElementById('review-form');
const ratingStars = document.querySelectorAll('.star-btn');
const reviewRatingInput = document.getElementById('review-rating');
const reviewsList = document.getElementById('reviews-list');

// Admin Elements
const navAdmin = document.getElementById('nav-admin');
const closeAdminBtn = document.getElementById('close-admin-btn');
const storeView = document.getElementById('store-view');
const adminView = document.getElementById('admin-view');
const adminOrdersRows = document.getElementById('admin-orders-rows');
const refreshOrdersBtn = document.getElementById('refresh-orders-btn');

// Mobile Nav Elements
const mobileNavToggle = document.getElementById('mobile-nav-toggle');
const navbar = document.getElementById('navbar');

// ==========================================================================
// Initialization & Event Listeners
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadCustomerProfile();
  fetchMenu();
  fetchReviews();
  setupEventListeners();
  updateCartBadge();
});

function setupEventListeners() {
  // Mobile Nav Toggle
  mobileNavToggle.addEventListener('click', () => {
    navbar.classList.toggle('mobile-active');
    const icon = mobileNavToggle.querySelector('i');
    if (navbar.classList.contains('mobile-active')) {
      icon.className = 'fa-solid fa-xmark';
    } else {
      icon.className = 'fa-solid fa-bars';
    }
  });

  // Close mobile nav when clicking links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      navbar.classList.remove('mobile-active');
      mobileNavToggle.querySelector('i').className = 'fa-solid fa-bars';
      
      // Handle Active Class
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // Cart Button Click
  cartBtn.addEventListener('click', () => {
    renderCart();
    cartDialog.showModal();
  });

  // Dialog Close buttons
  document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => {
      const dialogId = button.getAttribute('data-close');
      document.getElementById(dialogId).close();
    });
  });

  // Setup click outside backdrop to close dialogs (Bug 2 Fix)
  function setupBackdropClose(dialog) {
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      if (!isInDialog) {
        dialog.close();
      }
    });
  }
  setupBackdropClose(cartDialog);
  setupBackdropClose(profileDialog);
  setupBackdropClose(successDialog);
  setupBackdropClose(detailDialog);

  // Detail Modal Quantity Controls
  detailQtyMinus.addEventListener('click', () => {
    if (activeDetailQty > 1) {
      activeDetailQty--;
      detailQtyInput.value = activeDetailQty;
      updateDetailConfirmButton();
    }
  });

  detailQtyPlus.addEventListener('click', () => {
    activeDetailQty++;
    detailQtyInput.value = activeDetailQty;
    updateDetailConfirmButton();
  });

  // Detail Modal Confirm Order
  detailConfirmBtn.addEventListener('click', handleConfirmOrder);

  // Profile Form Submission
  document.getElementById('profile-form').addEventListener('submit', handleProfileSubmit);

  // Edit Profile Link in Cart
  editProfileBtn.addEventListener('click', () => {
    prefillProfileForm();
    profileDialog.showModal();
  });

  // Delivery / Pickup Preference Toggles
  prefDelivery.addEventListener('change', updateCartTotals);
  prefPickup.addEventListener('change', updateCartTotals);

  // Checkout Button
  checkoutBtn.addEventListener('click', handleCheckout);

  // Review Form Rating Selection
  ratingStars.forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.getAttribute('data-value'), 10);
      setRatingInput(val);
    });
  });

  // Review Form Submit
  reviewForm.addEventListener('submit', handleReviewSubmit);

  // Menu Category Filtering
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const category = btn.getAttribute('data-category');
      renderMenuItems(category);
    });
  });

  // Admin View Navigation
  navAdmin.addEventListener('click', (e) => {
    e.preventDefault();
    switchToAdminView();
  });

  closeAdminBtn.addEventListener('click', () => {
    switchToStoreView();
  });

  refreshOrdersBtn.addEventListener('click', fetchAdminOrders);
}

// ==========================================================================
// Fetching Data from API
// ==========================================================================
async function fetchMenu() {
  try {
    const res = await fetch('/api/menu');
    if (!res.ok) throw new Error('Failed to fetch menu');
    menuItems = await res.json();
    renderMenuItems('all');
  } catch (err) {
    console.error('Menu load error:', err);
    menuGrid.innerHTML = `
      <div class="spinner-container">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: var(--color-primary);"></i>
        <p style="margin-top: 10px;">Failed to load delicacies. Please try again later.</p>
      </div>
    `;
  }
}

async function fetchReviews() {
  try {
    const res = await fetch('/api/reviews');
    if (!res.ok) throw new Error('Failed to fetch reviews');
    const reviews = await res.json();
    renderReviews(reviews);
  } catch (err) {
    console.error('Reviews load error:', err);
  }
}

// ==========================================================================
// Rendering Functions
// ==========================================================================
function renderMenuItems(category = 'all') {
  menuGrid.innerHTML = '';
  
  const filtered = category === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === category);
    
  if (filtered.length === 0) {
    menuGrid.innerHTML = '<p class="text-center">No items available in this category.</p>';
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.style.cursor = 'pointer';
    card.innerHTML = `
      <div class="product-image-wrapper">
        <img src="${item.image}" alt="${item.name}">
        <span class="product-tag">${item.category}</span>
      </div>
      <div class="product-content">
        <div class="product-header">
          <h3 class="product-name">${item.name}</h3>
          <span class="product-price">Rs. ${item.price}</span>
        </div>
        <span class="product-flavor">${item.flavor}</span>
        <p class="product-desc">${item.description}</p>
        
        <div class="product-actions">
          <button class="btn btn-primary btn-full">Order Now</button>
        </div>
      </div>
    `;
    
    // Clicking any card opens the dedicated Item Detail Modal
    card.addEventListener('click', () => {
      openDetailModal(item.id);
    });
    
    menuGrid.appendChild(card);
  });
}

function renderReviews(reviews) {
  reviewsList.innerHTML = '';
  
  if (reviews.length === 0) {
    reviewsList.innerHTML = '<p class="text-center" style="font-style: italic; color: var(--color-text-muted);">Be the first to review us!</p>';
    return;
  }

  reviews.forEach(review => {
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    const dateFormatted = new Date(review.created_at).toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
      <div class="review-card-header">
        <span class="review-author">${escapeHtml(review.name)}</span>
        <span class="review-stars" aria-label="${review.rating} out of 5 stars">${stars}</span>
      </div>
      <p class="review-comment">"${escapeHtml(review.comment)}"</p>
      <div class="review-date">${dateFormatted}</div>
    `;
    reviewsList.appendChild(card);
  });
}

// ==========================================================================
// Item Detail Modal Logic (Direct Order Flow)
// ==========================================================================
function openDetailModal(itemId) {
  const item = menuItems.find(i => i.id === itemId);
  if (!item) return;

  activeDetailItem = item;
  activeDetailQty = 1;
  detailQtyInput.value = 1;

  detailItemName.textContent = item.name;
  detailItemImage.src = item.image;
  detailItemImage.alt = item.name;
  detailItemFlavor.textContent = item.flavor;
  detailItemDesc.textContent = item.description;
  detailItemPrice.textContent = `Rs. ${item.price}`;

  updateDetailConfirmButton();
  detailDialog.showModal();
}

function updateDetailConfirmButton() {
  if (activeDetailItem) {
    const total = activeDetailItem.price * activeDetailQty;
    detailConfirmBtn.textContent = `Confirm Order - Rs. ${total}`;
  }
}

function handleConfirmOrder() {
  detailDialog.close();

  // Prompt customer for profile if not saved
  if (!customerProfile) {
    pendingDirectOrder = { itemId: activeDetailItem.id, quantity: activeDetailQty };
    prefillProfileForm();
    profileDialog.showModal();
  } else {
    proceedToDirectCheckout(activeDetailItem.id, activeDetailQty);
  }
}

function proceedToDirectCheckout(itemId, quantity) {
  const item = menuItems.find(i => i.id === itemId);
  if (!item) return;

  // Set cart to contain exactly this item/quantity for direct buy
  cart = [{
    id: item.id,
    name: item.name,
    price: item.price,
    flavor: item.flavor,
    image: item.image,
    quantity: quantity
  }];

  updateCartBadge();
  renderCart();
  cartDialog.showModal();
}

// ==========================================================================
// Star Rating input Controls
// ==========================================================================
function setRatingInput(value) {
  currentRatingInput = value;
  reviewRatingInput.value = value;
  
  ratingStars.forEach(star => {
    const starVal = parseInt(star.getAttribute('data-value'), 10);
    if (starVal <= value) {
      star.classList.add('selected');
    } else {
      star.classList.remove('selected');
    }
  });
}

// ==========================================================================
// Customer Profile Logic
// ==========================================================================
function loadCustomerProfile() {
  const data = localStorage.getItem('whisk_customer_profile');
  if (data) {
    try {
      customerProfile = JSON.parse(data);
      updateProfileSummaryUI();
    } catch (e) {
      console.error('Error parsing customer profile', e);
      customerProfile = null;
    }
  }
}

function updateProfileSummaryUI() {
  if (customerProfile) {
    activeProfileSummary.classList.remove('hidden');
    summaryProfileName.textContent = customerProfile.name;
    summaryProfilePhone.textContent = customerProfile.phone;
    summaryDeliveryAddress.textContent = customerProfile.address;
  } else {
    activeProfileSummary.classList.add('hidden');
    summaryDeliveryAddress.textContent = 'No profile setup found. Click place order to set up your profile.';
  }
}

function prefillProfileForm() {
  if (customerProfile) {
    document.getElementById('profile-name').value = customerProfile.name;
    document.getElementById('profile-phone').value = customerProfile.phone;
    document.getElementById('profile-email').value = customerProfile.email;
    document.getElementById('profile-address').value = customerProfile.address;
  }
}

function handleProfileSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('profile-name').value.trim();
  const phone = document.getElementById('profile-phone').value.trim();
  const email = document.getElementById('profile-email').value.trim();
  const address = document.getElementById('profile-address').value.trim();
  
  customerProfile = { name, phone, email, address };
  localStorage.setItem('whisk_customer_profile', JSON.stringify(customerProfile));
  
  updateProfileSummaryUI();
  profileDialog.close();
  
  if (pendingDirectOrder) {
    const { itemId, quantity } = pendingDirectOrder;
    pendingDirectOrder = null;
    proceedToDirectCheckout(itemId, quantity);
  } else {
    renderCart();
  }
}

// ==========================================================================
// Shopping Cart Logic
// ==========================================================================
function updateCartBadge() {
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  cartCountBadge.textContent = totalItems;
  if (totalItems > 0) {
    cartCountBadge.classList.remove('hidden');
  } else {
    cartCountBadge.classList.add('hidden');
  }
}

function adjustItemQty(itemId, change) {
  const itemIndex = cart.findIndex(ci => ci.id === itemId);
  if (itemIndex === -1) return;
  
  cart[itemIndex].quantity += change;
  const newQty = cart[itemIndex].quantity;
  
  if (newQty <= 0) {
    cart.splice(itemIndex, 1);
  }
  
  updateCartBadge();
  if (cartDialog.open) {
    renderCart();
  }
}

function removeItemFromCart(itemId) {
  cart = cart.filter(ci => ci.id !== itemId);
  updateCartBadge();
  
  if (cartDialog.open) {
    renderCart();
  }
}

function renderCart() {
  cartItemsList.innerHTML = '';
  
  if (cart.length === 0) {
    cartEmptyMsg.classList.remove('hidden');
    cartContentWrapper.classList.add('hidden');
    return;
  }
  
  cartEmptyMsg.classList.add('hidden');
  cartContentWrapper.classList.remove('hidden');
  
  cart.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <button class="cart-item-remove" onclick="removeItemFromCart('${item.id}')" aria-label="Remove item"><i class="fa-solid fa-trash-can"></i></button>
      <div class="cart-item-img">
        <img src="${item.image}" alt="${item.name}">
      </div>
      <div class="cart-item-details">
        <div>
          <h4 class="cart-item-name">${item.name}</h4>
          <span class="cart-item-flavor">${item.flavor}</span>
        </div>
        <div class="cart-item-row">
          <div class="quantity-control">
            <button class="qty-btn" onclick="adjustItemQty('${item.id}', -1)"><i class="fa-solid fa-minus"></i></button>
            <input type="text" class="qty-input" value="${item.quantity}" readonly>
            <button class="qty-btn" onclick="adjustItemQty('${item.id}', 1)"><i class="fa-solid fa-plus"></i></button>
          </div>
          <span class="cart-item-price">Rs. ${item.price * item.quantity}</span>
        </div>
      </div>
    `;
    cartItemsList.appendChild(itemEl);
  });
  
  updateCartTotals();
}

function updateCartTotals() {
  const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const isDelivery = prefDelivery.checked;
  const deliveryFee = isDelivery ? 150 : 0;
  const grandTotal = subtotal + deliveryFee;
  
  cartSubtotalEl.textContent = `Rs. ${subtotal}`;
  cartDeliveryFeeEl.textContent = `Rs. ${deliveryFee}`;
  cartGrandTotalEl.textContent = `Rs. ${grandTotal}`;
  
  // Show / Hide delivery address box
  const addressBox = document.getElementById('delivery-address-confirmation');
  if (isDelivery) {
    addressBox.classList.remove('hidden');
  } else {
    addressBox.classList.add('hidden');
  }
}

// ==========================================================================
// Checkout / Submit Order
// ==========================================================================
async function handleCheckout() {
  // 1. Check if profile is complete
  if (!customerProfile) {
    profileDialog.showModal();
    return;
  }
  
  // 2. Select order type
  const orderType = prefDelivery.checked ? 'Delivery' : 'Self Pickup';
  const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const deliveryFee = orderType === 'Delivery' ? 150 : 0;
  const grandTotal = subtotal + deliveryFee;

  const orderPayload = {
    customer_name: customerProfile.name,
    customer_phone: customerProfile.phone,
    customer_email: customerProfile.email,
    customer_address: customerProfile.address,
    items: cart.map(item => ({
      id: item.id,
      name: item.name,
      flavor: item.flavor,
      quantity: item.quantity,
      price: item.price
    })),
    total_price: grandTotal,
    order_type: orderType
  };

  // UI state loading
  checkoutBtn.disabled = true;
  checkoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dispatching...';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    if (!res.ok) throw new Error('Order placement failed');
    const result = await res.json();
    
    // Clear Cart
    cart = [];
    updateCartBadge();
    
    // Close Cart
    cartDialog.close();
    
    // Populate success Modal
    document.getElementById('success-ref-id').textContent = `#${result.orderId}`;
    document.getElementById('success-email').textContent = customerProfile.email;
    
    const typeMsg = orderType === 'Self Pickup'
      ? 'Your order will be ready for pickup in 15–25 minutes.'
      : 'Your order will reach your saved address shortly.';
    document.getElementById('success-type-message').textContent = typeMsg;

    // Ethereal Link setup
    const etherealWrapper = document.getElementById('ethereal-email-link-wrapper');
    if (result.emailPreviewUrl) {
      const link = document.getElementById('ethereal-email-link');
      link.href = result.emailPreviewUrl;
      etherealWrapper.classList.remove('hidden');
    } else {
      etherealWrapper.classList.add('hidden');
    }
    
    // Show Success Modal
    successDialog.showModal();

  } catch (err) {
    alert('Failed to place order. Please check your internet connection and try again.');
    console.error('Checkout error:', err);
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.innerHTML = 'Place Order <i class="fa-solid fa-arrow-right"></i>';
  }
}

// ==========================================================================
// Review Submission
// ==========================================================================
async function handleReviewSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('review-name').value.trim();
  const comment = document.getElementById('review-comment').value.trim();
  const rating = currentRatingInput;
  
  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rating, comment })
    });
    
    if (!res.ok) throw new Error('Review submission failed');
    
    // Clear review form
    reviewForm.reset();
    setRatingInput(5);
    
    // Re-fetch reviews to display immediately
    fetchReviews();
    
  } catch (err) {
    alert('Failed to submit review.');
    console.error('Review submit error:', err);
  }
}

// ==========================================================================
// View Toggles (SPA Views)
// ==========================================================================
function switchToAdminView() {
  storeView.classList.add('hidden');
  adminView.classList.remove('hidden');
  document.getElementById('main-header').classList.add('hidden');
  fetchAdminOrders();
}

function switchToStoreView() {
  adminView.classList.add('hidden');
  storeView.classList.remove('hidden');
  document.getElementById('main-header').classList.remove('hidden');
  // Re-render menu to ensure sync
  renderMenuItems('all');
}

// ==========================================================================
// Admin Dashboard Logic
// ==========================================================================
async function fetchAdminOrders() {
  adminOrdersRows.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching transactions...</td></tr>';
  
  try {
    // 1. Fetch Orders
    const ordersRes = await fetch('/api/orders');
    if (!ordersRes.ok) throw new Error('Failed to load orders');
    const orders = await ordersRes.json();
    
    // 2. Fetch Reviews (for stats calculation)
    const reviewsRes = await fetch('/api/reviews');
    let reviews = [];
    if (reviewsRes.ok) {
      reviews = await reviewsRes.json();
    }
    
    // Calculate & update Stats
    calculateAdminStats(orders, reviews);
    
    // Render orders
    renderAdminOrders(orders);
    
  } catch (err) {
    console.error('Admin loading error:', err);
    adminOrdersRows.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to fetch transactions from database.</td></tr>';
  }
}

function calculateAdminStats(orders, reviews) {
  const totalOrders = orders.length;
  
  const totalRevenue = orders.reduce((sum, order) => sum + order.total_price, 0);
  
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
    
  const deliveryOrdersCount = orders.filter(o => o.order_type === 'Delivery').length;
  const deliveryRatio = totalOrders > 0
    ? Math.round((deliveryOrdersCount / totalOrders) * 100)
    : 0;
    
  document.getElementById('stat-total-orders').textContent = totalOrders;
  document.getElementById('stat-total-revenue').textContent = `Rs. ${totalRevenue.toLocaleString()}`;
  document.getElementById('stat-avg-rating').textContent = `${avgRating} / 5`;
  document.getElementById('stat-delivery-ratio').textContent = `${deliveryRatio}%`;
}

function renderAdminOrders(orders) {
  adminOrdersRows.innerHTML = '';
  
  if (orders.length === 0) {
    adminOrdersRows.innerHTML = '<tr><td colspan="8" class="text-center">No orders placed yet.</td></tr>';
    return;
  }
  
  orders.forEach(order => {
    // Items format
    const itemsListHtml = order.items.map(item => `
      <li>${escapeHtml(item.name)} <span class="summary-sub">(${escapeHtml(item.flavor)})</span> x <strong>${item.quantity}</strong></li>
    `).join('');
    
    const itemsHtml = `<ul class="admin-items-list">${itemsListHtml}</ul>`;
    
    // Contact Info Format
    const contactHtml = `
      <strong>${escapeHtml(order.customer_name)}</strong><br>
      <span class="summary-sub"><i class="fa-solid fa-phone"></i> ${escapeHtml(order.customer_phone)}</span><br>
      <span class="summary-sub"><i class="fa-solid fa-envelope"></i> ${escapeHtml(order.customer_email)}</span>
    `;

    // Time Format
    const timeFormatted = new Date(order.created_at).toLocaleString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short'
    });

    const statusBadgeClass = order.status.toLowerCase().replace(/ /g, '-');

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>#${order.id}</strong></td>
      <td>${contactHtml}</td>
      <td style="max-width: 200px; font-size: 0.85rem;">${escapeHtml(order.customer_address)}</td>
      <td>${itemsHtml}</td>
      <td>
        <span class="status-badge ${statusBadgeClass}">${order.order_type}</span>
      </td>
      <td><strong>Rs. ${order.total_price}</strong></td>
      <td>
        <select class="status-select" data-order-id="${order.id}" onchange="updateOrderStatus(${order.id}, this.value)">
          <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Preparing" ${order.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
          <option value="Out for Delivery" ${order.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
          <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
      </td>
      <td style="white-space: nowrap; font-size: 0.8rem; color: var(--color-text-muted);">${timeFormatted}</td>
    `;
    adminOrdersRows.appendChild(row);
  });
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!res.ok) throw new Error('Failed to update status');
    
    // Refresh admin data to update stats and tables correctly
    fetchAdminOrders();
  } catch (err) {
    alert('Failed to update order status.');
    console.error('Status update error:', err);
  }
}

// ==========================================================================
// Helper Utility Functions
// ==========================================================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
