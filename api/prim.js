// api/prim.js — Vercel Serverless Function — Talaria
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.PRIM_TOKEN;
  if (!token) return res.status(500).json({ error: 'PRIM_TOKEN non configuré.' });

  const { path, ...rest } = req.query;
  if (!path) return res.status(400).json({ error: 'Paramètre path manquant.' });

  const qsParts = [];
  for (const [k, v] of Object.entries(rest)) {
    const vals = Array.isArray(v) ? v : [v];
    vals.forEach(val => {
      const ek = encodeURIComponent(k);
      const ev = String(val).includes(';') ? String(val) : encodeURIComponent(String(val));
      qsParts.push(`${ek}=${ev}`);
    });
  }
  const primUrl = `https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/${path}${qsParts.length ? '?' + qsParts.join('&') : ''}`;

  try {
    const upstream = await fetch(primUrl, { headers: { apiKey: token } });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: `Erreur proxy : ${err.message}` });
  }
}
