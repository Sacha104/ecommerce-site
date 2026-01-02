// server.js
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const nodemailer = require("nodemailer");
const Stripe = require("stripe");

const config = require("./config");

const app = express();
const PORT = process.env.PORT || 3000;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());

// -------------------------
// Chargement des produits
// -------------------------
let products = [];
const productsPath = path.join(__dirname, "products.json");

function loadProducts() {
  const data = fs.readFileSync(productsPath, "utf8");
  products = JSON.parse(data);
}
loadProducts();

// -------------------------
// Nodemailer (envoi email)
// -------------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// -------------------------
// Routes API
// -------------------------

// Liste des produits (pour le frontend)
app.get("/api/products", (req, res) => {
  res.json(products);
});

// Création de commande (enregistre côté serveur, peut appeler fournisseur)
app.post("/api/orders", async (req, res) => {
  try {
    const { customer, items, paymentStatus } = req.body;

    // Validation basique
    if (!customer || !customer.name || !customer.email) {
      return res.status(400).json({ error: "Informations client invalides." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Aucun article dans la commande." });
    }

    // Calcul du total serveur (sécurité)
    let total = 0;
    const detailedItems = items.map((item) => {
      const prod = products.find((p) => p.id === item.id);
      if (!prod) return null;
      const quantity = Number(item.quantity) || 1;
      total += prod.price * quantity;
      return {
        id: prod.id,
        name: prod.name,
        price: prod.price,
        quantity
      };
    }).filter(Boolean);

    if (detailedItems.length === 0) {
      return res.status(400).json({ error: "Articles invalides." });
    }

    // Sauvegarde simple (ici en mémoire / fichier si besoin)
    const order = {
      id: "order_" + Date.now(),
      createdAt: new Date().toISOString(),
      customer,
      items: detailedItems,
      total,
      paymentStatus: paymentStatus || "pending"
    };

    console.log("Nouvelle commande:", order);

    // Envoi email au fournisseur
    const emailHtml = `
      <h1>Nouvelle commande - ${config.storeName}</h1>
      <p><strong>Client :</strong> ${customer.name} (${customer.email})</p>
      <p><strong>Statut paiement :</strong> ${order.paymentStatus}</p>
      <h2>Articles :</h2>
      <ul>
        ${detailedItems
          .map(
            (it) =>
              `<li>${it.name} x ${it.quantity} - ${(it.price / 100).toFixed(
                2
              )} €</li>`
          )
          .join("")}
      </ul>
      <p><strong>Total :</strong> ${(total / 100).toFixed(2)} €</p>
    `;

    await transporter.sendMail({
      from: config.email.from,
      to: config.supplier.email,
      subject: `Nouvelle commande - ${config.storeName} - ${order.id}`,
      html: emailHtml
    });

    // Optionnel : appel webhook API du fournisseur
    // if (config.supplier.webhookUrl) { ... }

    res.json({ success: true, order });
  } catch (error) {
    console.error("Erreur création commande:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Création d'une session Stripe Checkout
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { items, customer } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Aucun article dans le panier." });
    }

    const lineItems = items.map((item) => {
      const prod = products.find((p) => p.id === item.id);
      if (!prod) {
        throw new Error(`Produit introuvable: ${item.id}`);
      }
      const quantity = Number(item.quantity) || 1;
      return {
        price_data: {
          currency: config.currency,
          product_data: {
            name: prod.name,
            description: prod.description
          },
          unit_amount: prod.price
        },
        quantity
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${config.storeBaseUrl}${config.stripeRedirects.success}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.storeBaseUrl}${config.stripeRedirects.cancel}`,
      customer_email: customer && customer.email ? customer.email : undefined,
      metadata: {
        // Peut servir à reconstituer la commande côté webhook
        cart: JSON.stringify(items)
      }
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Erreur création session Stripe:", error);
    res.status(500).json({ error: "Erreur création session de paiement." });
  }
});

// Webhook Stripe (événement paiement réussi/échoué)
app.post(
  "/webhook/stripe",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Erreur webhook Stripe:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("Paiement réussi pour la session:", session.id);

      // Ici, tu peux récupérer les infos du panier depuis session.metadata.cart
      // et appeler /api/orders en interne, ou directement créer la commande ici.
      // Pour simplifier, on ne double pas la logique.
    }

    res.json({ received: true });
  }
);

// Fallback SPA (si besoin) ou laisser Express servir les fichiers statiques
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "index.html"));
// });

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
