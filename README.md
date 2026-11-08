# bepro — boutique COD algérienne

Boutique de sport bilingue français/arabe construite sur **CodFlow**, avec vitrine **Astro SSR**, dashboard d’administration et paiement à la livraison.

La structure et les interactions reprennent les principes UX de la référence fournie, sans copier ses textes, sa marque, son logo ni ses assets.

## Fonctionnalités livrées

- Accueil responsive : marquees, hero, 5 catégories, sélection de 6 produits, 8 promotions, avis, FAQ, réassurance et footer.
- Catalogue avec filtres, tri et pagination ; fiches produit avec tailles/variations et remises calculées.
- Panier, drawer, quantités, modale d’options et notifications toast.
- Checkout COD une page : nom, mobile algérien, wilaya, commune, adresse et livraison à domicile ou stop-desk.
- 58 wilayas, 1 541 communes et tarifs de livraison administrables.
- Total COD calculé côté serveur, livraison incluse ; le prix envoyé par le navigateur n’est jamais utilisé comme source de vérité.
- Confirmation `/merci`, compatibilité `/thank-you`, suivi public par numéro de commande et téléphone.
- Français par défaut, arabe RTL via `?lang=ar` ou le cookie `bepro_lang`.
- Honeypot, limitation à 10 commandes par IP et fenêtre, OTP WhatsApp et Turnstile optionnels.
- SEO : Open Graph `fr_DZ`, canonical, hreflang, Product JSON-LD, `robots.txt` et sitemap dynamique.
- Dashboard CodFlow : commandes, catalogue, variantes, stocks, pages et tarifs.

## Catalogue de démonstration

Le seed local `cod-server/scripts/seed-local.mjs` crée :

- 5 catégories ;
- 12 produits ;
- 27 variantes ;
- 6 produits vedettes ;
- les tarifs des 58 wilayas.

Les images sont des placeholders sport locaux en WebP. Elles peuvent être remplacées depuis le dashboard.

## Prérequis

- Node.js 22.12 ou supérieur ;
- npm ;
- les dépendances du dépôt : `npm ci`.

## Démarrage local

Dans trois terminaux, à la racine du dépôt :

```bash
npm run dev --workspace cod-server -- --ip 0.0.0.0
npm run dev --workspace cod-client-astro -- --host 0.0.0.0 --port 4321
npm run dev --workspace cod-astro/theme01 -- --host 0.0.0.0 --port 4322
```

| Service | URL |
|---|---|
| API | `http://localhost:8787` |
| Dashboard | `http://localhost:4321` |
| Vitrine | `http://localhost:4322` |

Pour le dashboard local, `.dev.vars` doit contenir :

```dotenv
PUBLIC_APP_URL=http://localhost:4321
```

Cette origine doit correspondre à `BETTER_AUTH_URL=http://localhost:4321/api/auth` dans `cod-server/.dev.vars`, afin que l’issuer des JWT soit accepté par l’API.

Les identifiants de développement sont conservés hors Git dans `/home/user/bepro-local-credentials.md`.

## Seed local

La base D1 locale persistée se trouve dans `.wrangler-shared`. Le seed bepro est idempotent :

```bash
cd cod-server
node scripts/seed-local.mjs
node --experimental-strip-types scripts/seed-store-pages.ts
```

## Routes principales

- `/` — accueil ;
- `/products` — catalogue ;
- `/category/:slug` — catégorie ;
- `/products/:handle` — fiche produit ;
- `/cart` — panier ;
- `/checkout` — commande COD ;
- `/track-order` — suivi ;
- `/merci` — confirmation ;
- `/thank-you` — page CodFlow compatible, avec pixels et query string.

## Validation

### Tests unitaires et contrats

```bash
npm run typecheck --workspace cod-server
npm test --workspace cod-astro/theme01
```

Dernier résultat : **400 tests réussis sur 400**, dans 29 fichiers.

### Builds

```bash
npm run build:ci --workspace cod-server
NODE_OPTIONS=--max-old-space-size=1200 npm run build --workspace cod-astro/theme01
NODE_OPTIONS=--max-old-space-size=1536 npm run build --workspace cod-client-astro
```

### Parcours Chromium

Avec l’API et la vitrine disponibles sur leurs ports locaux :

```bash
npx playwright install chromium
npm run test:e2e
```

Les trois scénarios couvrent :

1. accueil, variantes, panier, checkout, confirmation et suivi ;
2. mobile 390 px, arabe RTL et catalogue ;
3. stop-desk et compatibilité `/thank-you`.

### Build de production local

Après le build vitrine :

```bash
cd cod-astro/theme01
../../node_modules/.bin/wrangler dev --port 4322 --ip 0.0.0.0 --persist-to ../../../.wrangler-shared
```

## Lighthouse mobile

Mesure exécutée sur le build de production local :

| Catégorie | Score |
|---|---:|
| Performance | 96 |
| Accessibilité | 95 |
| Bonnes pratiques | 100 |
| SEO | 100 |

Rapports : `docs/bepro-reports/lighthouse-mobile.report.html` et `.json`.

## Configuration à remplacer avant production

Les éléments suivants restent volontairement des placeholders tant que le client ne fournit pas les informations réelles :

- logo, slogan et couleurs de marque définitifs ;
- numéro WhatsApp et téléphone ;
- domaine public et URL canonique ;
- catalogue, prix et visuels réels ;
- transporteurs et clés API ;
- clés OTP WhatsApp, Turnstile, Meta Pixel/CAPI et notifications.

Les transporteurs et l’OTP sont désactivés sans clés. Aucun déploiement Cloudflare n’a été effectué faute d’accès client.

## Preuves et historique

- Rapport final : `docs/bepro-reports/LIVRAISON-2026-11-08.md` ;
- captures : `docs/bepro-reports/captures/final/` ;
- sorties brutes : `docs/bepro-reports/logs/` ;
- diff par rapport à CodFlow : `docs/bepro-reports/codflow-bepro.diff` ;
- liste des fichiers : `docs/bepro-reports/fichiers-modifies.txt`.

La documentation technique générale de CodFlow reste disponible dans `docs/`.
