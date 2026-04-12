// api/prim.js — Vercel Serverless Function — Talaria
// URL correcte PRIM 2024 : /marketplace/v2/navitia/{feature} (sans coverage)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.PRIM_TOKEN;
  if (!token) return res.status(500).json({ error: 'PRIM_TOKEN non configuré.' });

  const url = new URL(req.url, 'http://localhost');
  const path = url.searchParams.get('path');
  if (!path) return res.status(400).json({ error: 'Paramètre path manquant.' });

  // Reconstruire les query params
  // Ne pas encoder ";" dans les coordonnées lon;lat
  const parts = [];
  url.searchParams.forEach((val, key) => {
    if (key === 'path') return;
    if (String(val).includes(';')) {
      parts.push(`${encodeURIComponent(key)}=${val}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  });

  // URL PRIM correcte post-2024 : marketplace/v2/navitia/ + feature (pas de coverage)
  const primUrl = `https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/${path}${parts.length ? '?' + parts.join('&') : ''}`;

  console.log('[Talaria] →', primUrl);

  try {
    const upstream = await fetch(primUrl, {
      headers: { 'apiKey': token, 'Accept': 'application/json' }
    });
    const text = await upstream.text();
    console.log('[Talaria] status:', upstream.status, '| preview:', text.slice(0, 200));
    let data;
    try { data = JSON.parse(text); }
    catch { data = { raw: text.slice(0, 500) }; }
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: `Erreur proxy : ${err.message}` });
  }
}
