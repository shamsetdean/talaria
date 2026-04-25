# Talaria — Patch correctif complet

Toutes les corrections appliquées au projet, **100 % gratuit** (zéro dépendance payante, ni à la conception, ni à l'usage).

## Ce qui a été corrigé

### Bugs critiques
| # | Avant | Après |
|---|---|---|
| 1 | Disruptions inventées par fallback (`Math.random` rush hour) | Vraie API PRIM via proxy serveur authentifié, **pas de fake** si l'API ne répond pas |
| 2 | `predictDelay` = `Math.floor(Math.random() * 4)` affiché comme prédiction | Désactivé proprement (retourne 0). Note dans le code pour réimplémentation sur SIRI |
| 3 | Vélib' via Overpass (statique OSM, pas de dispos) | **GBFS officiel** via `/api/velib` (vélos méca/élec/bornettes en temps réel) |
| 4 | Nominatim direct browser, User-Agent ignoré → ban garanti | **API Adresse data.gouv.fr (BAN)** via `/api/geocode` — gratuit, sans clé, qualité supérieure en France |
| 5 | `manifest.json` référencé sans Service Worker → PWA factice | **Vrai Service Worker** vanilla (~5 KB) avec offline + cache tuiles + cache API |
| 6 | Polling toutes les 30 s sans cache mutualisé → quota PRIM cramé | **Cache HTTP edge** Vercel (Cache-Control + CDN-Cache-Control) → 1 fetch upstream/min mutualisé entre tous les users |
| 7 | `getCrowd` hardcodé sur 6 lignes, label "Bondé" assertif | Étendu, label "(estim.)" pour transparence |
| 8 | Commentaire `OPENAQ` mais code Open-Meteo | Commentaire corrigé |

### Architecture de cache (mutualisée, gratuite)

| Endpoint | TTL frais | Stale-while-revalidate | Effet net |
|---|---|---|---|
| `/api/prim?path=places/...` | 5 min | 1 h | Recherche d'arrêts quasi-instantanée |
| `/api/prim?path=stop_areas/.../departures` | 15 s | 45 s | 4 fetch/min upstream max, peu importe le nombre d'users |
| `/api/prim?path=disruptions_bulk/...` | 60 s | 5 min | 1 fetch/min upstream pour toute la planète |
| `/api/prim?path=lines\|coverage\|...` | 1 h | 24 h | Quasi-statique |
| `/api/velib` | 60 s | 5 min | Aligné avec la fréquence GBFS officielle (1 min) |
| `/api/geocode?op=search` | 10 min | 1 h | Mutualisé sur les recherches récurrentes |
| `/api/geocode?op=reverse` | 24 h | 7 j | Adresses stables longtemps |
| Tuiles OSM | n/a | n/a | Cache durable côté Service Worker (LRU 600 entrées) |

## Arborescence livrée

```
talaria/
├── api/
│   ├── prim.js          # Edge Function — proxy IDFM PRIM (mis à jour)
│   ├── velib.js         # Edge Function — proxy GBFS Vélib' (nouveau)
│   └── geocode.js       # Edge Function — proxy BAN data.gouv.fr (nouveau)
├── public/
│   ├── index.html       # Application — patches chirurgicaux (head, geo, IA, disruptions, Vélib', SW boot)
│   ├── manifest.json    # PWA conforme avec icônes (mis à jour)
│   ├── sw.js            # Service Worker vanilla (nouveau)
│   ├── icon-192.png     # Icône PWA (nouvelle)
│   ├── icon-512.png     # Icône PWA (nouvelle)
│   ├── icon-maskable-512.png  # Icône PWA maskable Android (nouvelle)
│   ├── apple-touch-icon.png   # Icône iOS 180×180 (nouvelle)
│   └── favicon-32.png   # Favicon (nouvelle)
└── vercel.json          # Config rewrites + headers SW/manifest (mis à jour)
```

## Migration — étapes exactes

1. Remplace ces fichiers/dossiers dans ton repo GitHub Talaria :
   - `api/prim.js` → version livrée
   - `api/velib.js` → nouveau
   - `api/geocode.js` → nouveau
   - `public/index.html` → version patchée
   - `public/manifest.json` → version livrée
   - `public/sw.js` → nouveau
   - `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon-32.png` → nouveaux
   - `vercel.json` → version livrée

2. La variable d'environnement `PRIM_TOKEN` reste inchangée — Vercel la passe automatiquement aux Edge Functions.

3. Push sur `main` → déploiement automatique Vercel.

4. **Important après déploiement** : vide le cache navigateur sur ton iPhone (ou ouvre en navigation privée) pour forcer la prise en charge du Service Worker. Le SW prend la main au 2ᵉ chargement.

## Ce qui reste à 0 € — récapitulatif des sources

| Service | Statut | Quota | Où |
|---|---|---|---|
| IDFM PRIM | Gratuit | Quotas généreux par API (variable, mais avec notre cache : >100× moins de requêtes) | `prim.iledefrance-mobilites.fr` |
| API Adresse (BAN) | Gratuit illimité, service public | Pas de cap dur | `api-adresse.data.gouv.fr` |
| Vélib' GBFS | Gratuit illimité, sans clé | MAJ 1 min | `velib-metropole-opendata.smoove.pro` |
| Open-Meteo | Gratuit non-commercial | 10 000 req/jour, mais cachées par SW | `api.open-meteo.com` |
| Tuiles OSM | Gratuit (Tile Usage Policy) | OK avec cache SW agressif | `tile.openstreetmap.org` |
| Vercel | Hobby tier | 100 GB BW + 100K invocations/mois | Vercel |
| Edge Functions | Inclus dans Hobby | OK | Vercel |

Aucun service récurrent payant. Aucune clé externe requise au-delà de `PRIM_TOKEN` que tu possèdes déjà.

## Tests rapides à faire après déploiement

1. **Disruptions** : ouvrir l'onglet Alertes → soit la liste réelle, soit "Aucune perturbation signalée". Plus de fake fixe.
2. **Vélib'** : activer l'overlay → les pins affichent un nombre (vélos disponibles), couleur verte/orange/rouge selon stock.
3. **Geocoding** : taper "Tour Eiffel" puis "12 rue de Rivoli, Paris" → suggestions BAN, pas Nominatim.
4. **PWA** : Chrome devtools → Application → Service Workers → status "activated and running" + Manifest valide. Sur iPhone : "Ajouter à l'écran d'accueil" via Safari.
5. **Cache edge** : devtools Network → header `x-vercel-cache: HIT` après le 2ᵉ appel sur un endpoint identique.
6. **Offline** : couper le réseau → l'app continue à charger, les dernières données sont servies depuis le cache.

## Pistes d'amélioration suivantes (hors scope, optionnelles, gratuites)

- **Vrais retards** : implémenter `predictDelay` à partir des Stop Monitoring SIRI (`stop-monitoring`) en comparant `aimed_arrival_time` vs `expected_arrival_time` — uniquement quand la donnée est dispo, sinon ne rien afficher.
- **Affluence** : utiliser le crowdsourcing PRIM si disponible sur ta clé, sinon retirer complètement la grille d'affluence pour éviter toute estimation.
- **Calcul d'itinéraire local** (zéro appel PRIM journeys) avec OpenTripPlanner auto-hébergé sur Fly.io / Railway free tier — gros chantier mais quota PRIM totalement préservé.
- **Refonte modulaire** : Vite + Preact + TypeScript pour rendre les 2200 lignes maintenables sans casser les features.
