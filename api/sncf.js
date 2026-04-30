// api/sncf.js — Proxy Vercel pour l'API SNCF (Navitia coverage/sncf)
// La clé est stockée dans SNCF_API_KEY (Vercel Environment Variables)
// Format de base URL : https://api.sncf.com/v1/coverage/sncf/{path}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const apiKey = process.env.SNCF_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'SNCF_API_KEY non configurée.' });
    return;
  }

  // Paramètres attendus : ?path=journeys&from=...&to=...&count=...
  const { path, ...params } = req.query;
  if (!path) {
    res.status(400).json({ error: 'Paramètre path manquant.' });
    return;
  }

  // Construire l'URL Navitia SNCF
  const base = `https://api.sncf.com/v1/coverage/sncf/${path}`;
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${base}?${qs}` : base;

  try {
    // L'API SNCF utilise Basic Auth : token en username, mot de passe vide
    const credentials = Buffer.from(`${apiKey}:`).toString('base64');
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({
        error: `Erreur API SNCF (${response.status})`,
        detail: text.slice(0, 300),
      });
      return;
    }

    const data = await response.json();

    // Cache 30s côté CDN Vercel pour les requêtes identiques
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erreur proxy SNCF', detail: err.message });
  }
}
