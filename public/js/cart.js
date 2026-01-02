// public/js/cart.js

const CART_KEY = "ecommerce_cart";

function getCart() {
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity
    });
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
}

function updateCartItemQuantity(productId, quantity) {
  const cart = getCart();
  cart.forEach((item) => {
    if (item.id === productId) {
      item.quantity = quantity;
    }
  });
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartCount();
}

function getCartTotal() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function updateCartCount() {
  const countEl = document.querySelector(".cart-count");
  if (!countEl) return;
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  countEl.textContent = count;
}

// Rendu du panier dans le modal
function renderCartModal() {
  const cart = getCart();
  const modalBody = document.querySelector("#cart-modal-body");
  const totalEl = document.querySelector("#cart-total");

  if (!modalBody || !totalEl) return;

  if (cart.length === 0) {
    modalBody.innerHTML = "<p>Votre panier est vide.</p>";
    totalEl.textContent = "0,00 €";
    return;
  }

  modalBody.innerHTML = "";
  cart.forEach((item) => {
    const row = document.createElement("div");
    row.classList.add("cart-item-row");
    row.innerHTML = `
      <div class="cart-item-info">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-price">${(item.price / 100).toFixed(2)} €</span>
      </div>
      <div class="cart-item-actions">
        <input type="number" min="1" value="${item.quantity}" data-id="${item.id}" class="cart-qty-input" />
        <button class="btn btn-outline btn-sm remove-item" data-id="${item.id}">Supprimer</button>
      </div>
    `;
    modalBody.appendChild(row);
  });

  const total = getCartTotal();
  totalEl.textContent = (total / 100).toFixed(2) + " €";

  // Écouteurs pour quantité et suppression
  modalBody.querySelectorAll(".cart-qty-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const id = e.target.getAttribute("data-id");
      const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
      e.target.value = qty;
      updateCartItemQuantity(id, qty);
      renderCartModal();
    });
  });

  modalBody.querySelectorAll(".remove-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      removeFromCart(id);
      renderCartModal();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
});
