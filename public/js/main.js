// public/js/main.js

document.addEventListener("DOMContentLoaded", () => {
  applyConfig();
  setupCartModal();
  loadProductsIfNeeded();
  setupContactForm();
  setupBuyNowButton();
});

function applyConfig() {
  const cfg = window.APP_CONFIG;
  if (!cfg) return;

  document.querySelectorAll(".store-name").forEach((el) => {
    el.textContent = cfg.storeName;
  });

  const logo = document.querySelector(".logo-text");
  if (logo) logo.textContent = cfg.logoText;

  // Couleurs via CSS variables
  document.documentElement.style.setProperty("--color-primary", cfg.primaryColor);
  document.documentElement.style.setProperty("--color-secondary", cfg.secondaryColor);
  document.documentElement.style.setProperty("--color-accent", cfg.accentColor);
}

// ------------------------
// Cart modal
// ------------------------
function setupCartModal() {
  const openBtn = document.querySelector(".cart-button");
  const modal = document.querySelector("#cart-modal");
  const closeBtn = document.querySelector("#cart-modal-close");
  const overlay = document.querySelector("#cart-modal-overlay");
  const checkoutBtn = document.querySelector("#cart-checkout-btn");

  if (!modal) return;

  function openModal() {
    renderCartModal();
    modal.classList.add("open");
  }

  function closeModal() {
    modal.classList.remove("open");
  }

  if (openBtn) openBtn.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (overlay) overlay.addEventListener("click", closeModal);

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", async () => {
      const cart = getCart();
      if (cart.length === 0) {
        alert("Votre panier est vide.");
        return;
      }

      // Pour la démo, on ne demande pas toutes les infos client ici
      const customer = {
        name: "Client Test",
        email: "client@example.com"
      };

      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: cart, customer })
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert("Erreur lors de la création du paiement.");
        }
      } catch (err) {
        console.error(err);
        alert("Erreur serveur.");
      }
    });
  }
}

// ------------------------
// Chargement des produits
// ------------------------
async function loadProductsIfNeeded() {
  const container = document.querySelector("#products-list");
  if (!container) return; // pas sur cette page

  try {
    const res = await fetch("/api/products");
    const products = await res.json();

    container.innerHTML = "";
    products.forEach((p) => {
      const card = document.createElement("div");
      card.classList.add("product-card");

      card.innerHTML = `
        <img src="${p.image}" alt="${p.name}" class="product-image" />
        <h3 class="product-title">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <p class="product-price">${(p.price / 100).toFixed(2)} €</p>
        <button class="btn btn-primary add-to-cart" data-id="${p.id}">Ajouter au panier</button>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll(".add-to-cart").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const product = products.find((prod) => prod.id === id);
        if (product) {
          addToCart(product, 1);
          alert("Produit ajouté au panier.");
        }
      });
    });
  } catch (err) {
    console.error("Erreur chargement produits:", err);
    container.innerHTML = "<p>Impossible de charger les produits.</p>";
  }
}

// ------------------------
// Formulaire de contact
// ------------------------
function setupContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.elements["name"].value.trim();
    const email = form.elements["email"].value.trim();
    const message = form.elements["message"].value.trim();

    if (!name || !email || !message) {
      alert("Veuillez remplir tous les champs.");
      return;
    }
    if (!validateEmail(email)) {
      alert("Adresse email invalide.");
      return;
    }

    // Ici on pourrait envoyer au backend. Pour la démo, on log seulement.
    console.log("Contact form:", { name, email, message });
    alert("Merci pour votre message ! Nous vous répondrons rapidement.");
    form.reset();
  });
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

// ------------------------
// Bouton "Acheter maintenant"
// ------------------------
function setupBuyNowButton() {
  const btn = document.querySelector("#hero-buy-now");
  if (!btn) return;
  btn.addEventListener("click", () => {
    window.location.href = "/products.html";
  });
}
