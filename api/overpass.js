/**
 * api/overpass.js — Proxy Vercel pour l'API Overpass
 *
 * Contourne le CORS : la requête part du serveur (pas du navigateur).
 * Place ce fichier dans /api/overpass.js à la racine de ton projet Vercel.
 *
 * Usage depuis le front : fetch('/api/overpass?data=<query_encodée>')
 */
export default async function handler(req, res) {
  // CORS pour les requêtes navigateur
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { data } = req.query;
  if (!data) {
    return res.status(400).json({ error: 'Paramètre "data" manquant' });
  }

  // Miroirs Overpass par ordre de préférence
  const MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter'
  ];

  for (const endpoint of MIRRORS) {
    try {
      const response = await fetch(
        `${endpoint}?data=${encodeURIComponent(data)}`,
        {
          headers: { 'User-Agent': 'Talaria/1.0 (transport app IDF)' },
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) continue;

      const json = await response.json();

      // Cache 5 minutes côté CDN Vercel
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
      return res.status(200).json(json);

    } catch {
      continue; // essaie le miroir suivant
    }
  }

  return res.status(502).json({ error: 'Tous les miroirs Overpass sont indisponibles' });
}
