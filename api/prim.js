// ════════════════════════════════════════════════════════════════════
// /api/prim — Proxy IDFM PRIM avec cache HTTP edge
//
// • Edge runtime : cold start ~10–50 ms (vs 300–1500 ms en Node)
// • Cache mutualisé via Cache-Control + CDN-Cache-Control (gratuit Vercel)
// • Routage automatique selon le path :
//      "journeys", "places", "stop_areas/…/departures"  → Navitia v2 (fr-idf)
//      "disruptions_bulk/…", "disruptions/…"            → Marketplace direct
//      "stop-monitoring", "general-message"             → Marketplace direct
//
// Variable d'environnement requise : PRIM_TOKEN
// ════════════════════════════════════════════════════════════════════

export const config = { runtime: 'edge' };

const PRIM_BASE   = 'https://prim.iledefrance-mobilites.fr/marketplace';
const NAVITIA_BASE = `${PRIM_BASE}/v2/navitia/coverage/fr-idf`;

// TTL adapté au type de donnée. Toutes les valeurs sont conservatrices.
//   s-maxage              = TTL servi frais par le CDN (réponse < x s : cache)
//   stale-while-revalidate = pendant y s après expiration, sert le cache
//                            tout en revalidant en arrière-plan (UX fluide)
function cachePolicy(path) {
  if (path.includes('disruptions'))                     return 's-maxage=60,  stale-while-revalidate=300';
  if (path.startsWith('places'))                        return 's-maxage=300, stale-while-revalidate=3600';
  if (path.startsWith('lines') ||
      path.startsWith('networks') ||
      path.startsWith('physical_modes') ||
      path.startsWith('commercial_modes') ||
      path.startsWith('coverage'))                      return 's-maxage=3600,stale-while-revalidate=86400';
  if (path.startsWith('journeys'))                      return 's-maxage=15,  stale-while-revalidate=60';
  if (path.includes('departures') ||
      path.includes('stop_schedules') ||
      path.includes('stop-monitoring'))                 return 's-maxage=15,  stale-while-revalidate=45';
  return                                                       's-maxage=20,  stale-while-revalidate=60';
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
  });
}

export default async function handler(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const url  = new URL(req.url);
  const path = (url.searchParams.get('path') || '').replace(/^\/+/, '');
  if (!path) return jsonResponse({ error: 'path required' }, 400);

  const apiKey = (typeof process !== 'undefined' && process.env && process.env.PRIM_TOKEN) || '';
  if (!apiKey) return jsonResponse({ error: 'PRIM_TOKEN missing on server' }, 500);

  // Routage cible
  let target;
  if (path.startsWith('disruptions_bulk/') || path.startsWith('disruptions/')
      || path.startsWith('stop-monitoring')   || path.startsWith('general-message')
      || path.startsWith('estimated-timetable')) {
    target = `${PRIM_BASE}/${path}`;
  } else {
    target = `${NAVITIA_BASE}/${path}`;
  }

  // Forwarder les autres query params (sauf 'path')
  const tgt = new URL(target);
  for (const [k, v] of url.searchParams.entries()) {
    if (k !== 'path') tgt.searchParams.append(k, v);
  }

  // Appel upstream avec timeout
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let upstream;
  try {
    upstream = await fetch(tgt.toString(), {
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json',
      },
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    return jsonResponse({ error: 'upstream_unreachable', detail: String(e && e.message || e) }, 502, {
      'Cache-Control': 'public, s-maxage=5',
    });
  }
  clearTimeout(timer);

  const body = await upstream.text();
  const policy = upstream.ok ? cachePolicy(path) : 's-maxage=5';

  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control':       `public, ${policy}`,
      'CDN-Cache-Control':   `public, ${policy}`,
      'Vercel-CDN-Cache-Control': `public, ${policy}`,
    },
  });
}
