// ════════════════════════════════════════════════════════════════════
// /api/geocode — Géocodage France via API Adresse data.gouv.fr (BAN)
//
//   ?op=search&q=<text>[&limit=5]      → autocomplete + recherche
//   ?op=reverse&lat=<l>&lon=<l>        → reverse geocoding
//
// • Service public français, gratuit, sans clé, sans cap dur.
// • Optimisé pour la France (et donc l'IDF) — qualité supérieure
//   à Nominatim sur ce périmètre, et pas de policy violation.
// • Filtrage IDF côté serveur via citycode (75/77/78/91/92/93/94/95)
// • Cache CDN agressif sur les requêtes search.
// ════════════════════════════════════════════════════════════════════

export const config = { runtime: 'edge' };

const BAN = 'https://api-adresse.data.gouv.fr';

const IDF_DEPTS = new Set(['75', '77', '78', '91', '92', '93', '94', '95']);

function jsonResponse(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      ...extra,
    },
  });
}

export default async function handler(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(req.url);
  const op  = url.searchParams.get('op') || 'search';

  let target;

  if (op === 'reverse') {
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    if (!lat || !lon) return jsonResponse({ error: 'lat/lon required' }, 400);
    target = `${BAN}/reverse/?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  } else if (op === 'search') {
    const q = (url.searchParams.get('q') || '').trim();
    if (q.length < 3) return jsonResponse({ type: 'FeatureCollection', features: [] });
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '5', 10) || 5, 10);
    target = `${BAN}/search/?q=${encodeURIComponent(q)}&limit=${limit}&autocomplete=1`;
  } else {
    return jsonResponse({ error: 'invalid op' }, 400);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);

  let upstream;
  try {
    upstream = await fetch(target, {
      headers: { 'Accept': 'application/json' },
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    return jsonResponse({ error: 'upstream_unreachable' }, 502, { 'Cache-Control': 'public, s-maxage=5' });
  }
  clearTimeout(timer);

  if (!upstream.ok) {
    return jsonResponse({ type: 'FeatureCollection', features: [] }, 200, { 'Cache-Control': 'public, s-maxage=5' });
  }

  let data;
  try { data = await upstream.json(); }
  catch (e) { return jsonResponse({ type: 'FeatureCollection', features: [] }); }

  // Filtrage IDF pour la recherche : on remonte d'abord les résultats IDF
  if (op === 'search' && Array.isArray(data.features)) {
    const idf = [], other = [];
    for (const f of data.features) {
      const cc = f && f.properties && f.properties.citycode;
      if (cc && IDF_DEPTS.has(String(cc).slice(0, 2))) idf.push(f);
      else other.push(f);
    }
    data.features = idf.concat(other);
  }

  const policy = op === 'reverse'
    ? 'public, s-maxage=86400, stale-while-revalidate=604800'   // adresse stable longtemps
    : 'public, s-maxage=600,   stale-while-revalidate=3600';    // recherche : 10 min

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control':            policy,
      'CDN-Cache-Control':        policy,
      'Vercel-CDN-Cache-Control': policy,
    },
  });
}
