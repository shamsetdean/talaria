// ════════════════════════════════════════════════════════════════════
// Talaria — Service Worker
//
// Sans dépendance (zéro Workbox), ~5 KB, stratégies adaptées :
//   • Shell (HTML/CSS/JS du site, Leaflet CDN) → Stale-While-Revalidate
//   • Tuiles OSM                              → Cache-First (durable)
//   • Proxy /api/*                            → Network-First avec fallback cache
//   • Reste                                   → Pass-through réseau
//
// Augmenter VERSION pour invalider tous les caches.
// ════════════════════════════════════════════════════════════════════

const VERSION = 'talaria-2026-04-25-1';
const SHELL_CACHE = `${VERSION}-shell`;
const TILE_CACHE  = `${VERSION}-tiles`;
const API_CACHE   = `${VERSION}-api`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// Limite de taille pour le cache tuiles (LRU best-effort)
const TILE_CACHE_MAX_ENTRIES = 600;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(c =>
      // addAll échoue si l'un des assets renvoie un non-200 ; on tolère donc
      // un échec partiel en faisant les requêtes individuelles.
      Promise.all(SHELL_ASSETS.map(u =>
        fetch(u, { cache: 'no-cache' }).then(r => r.ok && c.put(u, r)).catch(() => {})
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Tuiles OSM → Cache-First, durable
  if (/(^|\.)tile\.openstreetmap\.org$/.test(url.hostname)
      || /(^|\.)basemaps\.cartocdn\.com$/.test(url.hostname)) {
    event.respondWith(cacheFirstTiles(req));
    return;
  }

  // 2) /api/* → Network-First, fallback cache
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(req));
    return;
  }

  // 3) Shell : navigation HTML → renvoyer index.html en offline
  if (req.mode === 'navigate') {
    event.respondWith(networkFallbackToShell(req));
    return;
  }

  // 4) Assets statiques même origine + Leaflet CDN → SWR
  if (url.origin === self.location.origin
      || url.hostname === 'unpkg.com'
      || url.hostname.endsWith('.openstreetmap.org') === false
         && (url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com')) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
  // Sinon : pass-through réseau (par défaut)
});

// ───────── Stratégies ─────────

async function cacheFirstTiles(req) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      cache.put(req, res.clone());
      // LRU best-effort
      trimCache(TILE_CACHE, TILE_CACHE_MAX_ENTRIES);
    }
    return res;
  } catch {
    return cached || new Response('', { status: 504 });
  }
}

async function networkFirstApi(req) {
  const cache = await caches.open(API_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkFallbackToShell(req) {
  try {
    return await fetch(req);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match('/index.html') || await cache.match('/');
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys  = await cache.keys();
    if (keys.length <= maxEntries) return;
    // Supprime les plus anciens (Cache API ne donne pas l'ordre temporel,
    // on supprime simplement les premiers stockés)
    for (let i = 0; i < keys.length - maxEntries; i++) {
      await cache.delete(keys[i]);
    }
  } catch {}
}
