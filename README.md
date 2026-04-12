# Talaria 🚇

Talaria · Voyagez plus vite, voyagez mieux.

## Stack
- Frontend : HTML/CSS/JS vanilla + Leaflet (carte)
- Backend : Vercel Serverless Function (proxy PRIM)
- Données : API PRIM · Île-de-France Mobilités
- Carte : OpenStreetMap

## Déploiement Vercel (10 minutes)

### 1. Créer le repo GitHub
1. Va sur github.com → New repository
2. Nom : `talaria` (ou ce que tu veux)
3. Upload tous les fichiers de ce dossier

### 2. Déployer sur Vercel
1. Va sur **vercel.com** → Sign up avec ton compte GitHub (gratuit)
2. Click "New Project" → importe ton repo `talaria`
3. Vercel détecte automatiquement la config → click **Deploy**

### 3. Ajouter le jeton PRIM (SECRET)
Dans Vercel, une fois déployé :
1. Settings → Environment Variables
2. Ajouter :
   - **Name** : `PRIM_TOKEN`
   - **Value** : ton jeton PRIM copié depuis prim.iledefrance-mobilites.fr
3. Click **Save**
4. Aller dans **Deployments** → click les 3 points → **Redeploy**

C'est tout. Le jeton n'est jamais dans le code, jamais visible publiquement.

## Structure du projet
```
talaria/
├── api/
│   └── prim.js          ← Fonction serverless (proxy sécurisé)
├── public/
│   └── index.html       ← Application frontend complète
├── vercel.json          ← Config Vercel
└── package.json
```

## Fonctionnalités
- **Trajet** : départ/arrivée en texte libre, autocomplete, itinéraires triés par durée, détail étape par étape, tracé sur carte
- **Arrêt** : recherche par nom avec autocomplete, géolocalisation (arrêt le plus proche), prochains passages temps réel, actualisation auto 30s
- **Carte** : OpenStreetMap dark, tracé des itinéraires, marqueur d'arrêt, position utilisateur

## Données
- Source : Île-de-France Mobilités · PRIM API
- Carte : © OpenStreetMap contributors
- Quota PRIM gratuit : 20 000 requêtes/jour
