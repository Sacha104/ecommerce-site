// config.js
// Fichier pour centraliser les infos modifiables par client

module.exports = {
  storeName: "Ma Boutique Démo",
  storeBaseUrl: "http://localhost:3000", // à adapter en prod

  // Coordonnées fournisseur (pour l'envoi d'email)
  supplier: {
    name: "Fournisseur Démo",
    email: "fournisseur@example.com",
    webhookUrl: "" // optionnel : URL API du fournisseur (POST)
  },

  // Email d'envoi (expéditeur)
  email: {
    from: "no-reply@ma-boutique-demo.com",
    // Le compte qui envoie l'email sera configuré dans .env
  },

  // Monnaie
  currency: "eur",

  // URL du frontend (pour les redirections Stripe)
  stripeRedirects: {
    success: "/success.html",
    cancel: "/cancel.html"
  }
};
