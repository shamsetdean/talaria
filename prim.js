// api/prim.js — Vercel Serverless Function
// Le jeton PRIM est stocké en variable d'environnement, jamais exposé au client

export default async function handler(req, res) {
  // CORS pour GitHub Pages ou tout autre domaine
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.PRIM_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'PRIM_TOKEN non configuré sur le serveur.' });
  }

  // Le client envoie le chemin PRIM via ?path=...
  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'Paramètre path manquant.' });
  }

  // Reconstruire l'URL PRIM complète avec les autres query params
  const queryParams = { ...req.query };
  delete queryParams.path;
  const qs = new URLSearchParams(queryParams).toString();
  const primUrl = `https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/${path}${qs ? '?' + qs : ''}`;

  try {
    const upstream = await fetch(primUrl, {
      headers: { apiKey: token }
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: `Erreur proxy PRIM : ${err.message}` });
  }
}
