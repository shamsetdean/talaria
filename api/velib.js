// ════════════════════════════════════════════════════════════════════
// /api/velib — Données Vélib' Métropole temps réel (GBFS officiel)
//
// • Source : https://velib-metropole-opendata.smoove.pro/opendata/Velib_Metropole/
//   API publique gratuite, sans clé, mise à jour chaque minute (GBFS 1.0)
// • Le proxy fusionne station_information.json + station_status.json
//   pour fournir : lat/lon, nom, capacité, vélos méca dispos,
//   vélos électriques dispos, bornettes libres, statut (renting/returning).
// • Cache CDN 60 s : un seul fetch upstream/min, mutualisé entre tous les users.
// ════════════════════════════════════════════════════════════════════

export const config = { runtime: 'edge' };

const INFO_URL   = 'https://velib-metropole-opendata.smoove.pro/opendata/Velib_Metropole/station_information.json';
const STATUS_URL = 'https://velib-metropole-opendata.smoove.pro/opendata/Velib_Metropole/station_status.json';

const CACHE_POLICY = 'public, s-maxage=60, stale-while-revalidate=300';

function jsonResponse(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      ...headers,
    },
  });
}

export default async function handler(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const [infoR, statusR] = await Promise.all([
      fetch(INFO_URL,   { signal: ctrl.signal }),
      fetch(STATUS_URL, { signal: ctrl.signal }),
    ]);
    clearTimeout(timer);

    if (!infoR.ok || !statusR.ok) {
      return jsonResponse(
        { stations: [], error: 'upstream_error', infoStatus: infoR.status, statusStatus: statusR.status },
        200,
        { 'Cache-Control': 'public, s-maxage=10' },
      );
    }

    const [info, status] = await Promise.all([infoR.json(), statusR.json()]);

    // Indexer le statut par station_id
    const statusMap = new Map();
    for (const s of (status.data && status.data.stations) || []) {
      statusMap.set(s.station_id, s);
    }

    // Fusion
    const stations = [];
    for (const stn of (info.data && info.data.stations) || []) {
      const st = statusMap.get(stn.station_id);
      if (!st || st.is_installed !== 1) continue;

      // GBFS 1.0 : num_bikes_available_types est un tableau de 2 objets
      // [{mechanical: N}, {ebike: N}] mais l'ordre n'est pas garanti.
      let mech = 0, ebike = 0;
      const types = st.num_bikes_available_types;
      if (Array.isArray(types)) {
        for (const t of types) {
          if (typeof t.mechanical === 'number') mech  = t.mechanical;
          if (typeof t.ebike      === 'number') ebike = t.ebike;
        }
      }

      stations.push({
        id:       stn.station_id,
        name:     stn.name,
        lat:      stn.lat,
        lon:      stn.lon,
        capacity: stn.capacity || 0,
        mech,
        ebike,
        docks:    st.num_docks_available || 0,
        renting:  st.is_renting   === 1,
        returning:st.is_returning === 1,
      });
    }

    return new Response(JSON.stringify({ stations, ts: Date.now() }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control':            CACHE_POLICY,
        'CDN-Cache-Control':        CACHE_POLICY,
        'Vercel-CDN-Cache-Control': CACHE_POLICY,
      },
    });
  } catch (e) {
    clearTimeout(timer);
    return jsonResponse(
      { stations: [], error: String(e && e.message || e) },
      200,
      { 'Cache-Control': 'public, s-maxage=10' },
    );
  }
}
