# Talaria — Sandales ailées · Transport IDF

> Transport Île-de-France — application mobile-first intelligente

**URL de production :** [talaria-iota.vercel.app](https://talaria-iota.vercel.app)  
**Repo :** [github.com/shamsetdean/talaria](https://github.com/shamsetdean/talaria)

---

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML / CSS / JavaScript vanilla |
| Carte | Leaflet + OpenStreetMap |
| Backend | Vercel Serverless Function (proxy API) |
| Déploiement | Vercel (CI/CD automatique via GitHub) |

---

## APIs intégrées

| API | Usage | Clé requise |
|-----|-------|-------------|
| **IDFM PRIM v2** | Itinéraires, horaires, arrêts, départs temps réel | Oui — variable `PRIM_TOKEN` |
| **Nominatim (OSM)** | Geocodage et reverse geocodage | Non |
| **Open-Meteo** | Météo temps réel, précipitations, vent | Non |
| **Open-Meteo Air Quality** | Indice qualité de l'air (AQI européen) | Non |
| **Overpass API (OSM)** | Stations Vélib' et vélos en libre-service | Non |
| **IDFM Open Data** | Perturbations en cours, accessibilité PMR | Non |
| **HERE Geocoding** | Fallback autocomplete (si Nominatim insuffisant) | Optionnelle |

---

## Fonctionnalités

### Navigation
- Calcul d'itinéraire multimodal (métro, RER, bus, tram, marche, vélo)
- Géolocalisation automatique du point de départ
- Autocomplete des adresses
- Tap sur la carte pour choisir une destination
- Option marche proposée en premier si plus rapide (< 2 km)
- Tri des résultats : Rapide / Moins de stress / Moins bondé

### Temps réel
- Prochains passages par arrêt (actualisation toutes les 30s)
- Marqueurs d'arrêts proches sur la carte avec distance
- Popup de passages au tap sur un marqueur
- Stations Vélib' affichées sur la carte

### Intelligence artificielle (heuristiques)
- Prédiction du niveau d'affluence par ligne et heure
- Estimation des retards selon heure de pointe et ligne
- Score de stress par itinéraire (correspondances + marche + heure)
- Alertes météo automatiques (pluie, vent fort)
- Alertes qualité de l'air

### Alertes
- Bannière heure de pointe automatique
- Perturbations en cours (IDFM ou simulées)
- Grille d'affluence par ligne en temps réel
- Prédictions IA contextualisées

### Personnalisation
- Sauvegarde des trajets favoris
- Adresses domicile / travail
- Préférence d'optimisation persistante
- Signalement d'incidents communautaires

### Interface
- 5 onglets : Trajet · Arrêts · Alertes · Favoris · Réglages
- Logo sandales ailées SVG
- Favicon intégré (SVG base64)
- Animations style Framer Motion (slide, scale, stagger, skeleton)
- Barre météo + qualité de l'air en temps réel
- 100% mobile-first, compatible iPhone et Android

---

## Structure du repo

```
talaria/
├── api/
│   └── prim.js          # Proxy Vercel → IDFM PRIM (évite CORS + masque la clé)
├── public/
│   └── index.html       # Application complète (fichier unique, ~127 KB)
├── vercel.json          # Config déploiement + rewrite API
├── package.json
└── README.md
```

---

## Déploiement

### Prérequis
- Compte [Vercel](https://vercel.com) connecté à GitHub
- Clé API PRIM — obtenir sur [prim.iledefrance-mobilites.fr](https://prim.iledefrance-mobilites.fr)

### Étapes

1. Forker ou cloner ce repo sur GitHub
2. Importer le projet sur Vercel
3. Ajouter la variable d'environnement :
   ```
   PRIM_TOKEN = votre_clé_api_prim
   ```
4. Vérifier que `vercel.json` contient :
   ```json
   {
     "outputDirectory": "public",
     "rewrites": [
       { "source": "/api/prim(.*)", "destination": "/api/prim" }
     ]
   }
   ```
5. Déployer — Vercel redéploie automatiquement à chaque push sur `main`

---

## Mise à jour du fichier principal

Pour mettre à jour l'application :

1. Remplacer `public/index.html` par le nouveau fichier
2. Commiter sur GitHub → déploiement automatique en ~30 secondes

> **Important :** toujours uploader depuis le fichier local récent, pas depuis GitHub (pour éviter les régressions).

---

## Variables d'environnement

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `PRIM_TOKEN` | Clé API IDFM PRIM | Oui |

---

## Auteur

**Shams & Dean** · [github.com/shamsetdean](https://github.com/shamsetdean)  
Anthropotech · Lab — *Créatif orienté solutions · Automatisation · IA*
