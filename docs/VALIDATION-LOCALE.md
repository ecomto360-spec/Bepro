# Validation locale — Extension Stock & Rentabilité (WIP)

Ce document est une **procédure à exécuter sur votre PC**. Les commandes ci-dessous ne constituent pas une preuve de validation tant que vous n’avez pas leurs sorties. Conserver les sorties brutes dans des fichiers hors dépôt ou dans un rapport de test sans secrets.

## 1. Prérequis et installation

- Node.js `>=22.12.0` et npm ;
- Git ;
- un clone à jour de `https://github.com/ecomto360-spec/Bepro.git`, branche `main` ;
- aucune clé Cloudflare n’est nécessaire pour les commandes `--local` et `--dry-run` ;
- ne jamais committer `.env`, `.dev.vars`, mots de passe, clés API ou état `.wrangler-shared`.

Dans un terminal à la racine du dépôt :

```bash
node --version
npm --version
git switch main
git pull --ff-only origin main
npm ci
```

Créer les fichiers locaux à partir des exemples du dépôt :

```bash
# macOS / Linux / Git Bash
cp .env.example .env
cp cod-server/.dev.vars.example cod-server/.dev.vars
cp cod-client-astro/.dev.vars.example cod-client-astro/.dev.vars
```

Sous PowerShell, utiliser `Copy-Item .env.example .env`, puis les deux `Copy-Item` équivalents. Renseigner uniquement des valeurs de test locales. Vérifier notamment `COD_DB_NAME`, `PUBLIC_API_URL=http://localhost:8787`, `BETTER_AUTH_URL=http://localhost:4321/api/auth` et les secrets locaux requis par le projet. Ne pas utiliser les identifiants de production.

## 2. Tests unitaires des formules

À la racine :

```bash
node --test extensions/stock-profitability/tests/money.test.mjs
```

Critère : `tests 8`, `pass 8`, `fail 0`.

Typechecks et tests du noyau :

```bash
npm run typecheck --workspace cod-server
npm run typecheck --workspace cod-client-astro
npm run test:unit --workspace cod-server
```

Critère : code de sortie `0`, aucune erreur TypeScript ni test en échec. Les tests du noyau peuvent être plus longs ; conserver leur sortie complète.

## 3. Build Astro et build Worker

```bash
npm run build --workspace cod-client-astro
npm run build:ci --workspace cod-server
```

Critères :

- Astro se termine par `[build] Complete!` et contient `/extensions/index.html` ainsi que `/extensions/stock-profitability/index.html` ;
- Worker affiche `Total Upload: ...` puis `--dry-run: exiting now.` ;
- aucun `wrangler deploy` réel n’est demandé.

## 4. Base D1 locale propre

Ces commandes utilisent uniquement `../.wrangler-shared`. Ne pas ajouter `--remote`.

```bash
cd cod-server
npm run db:migrate:local
npm run db:seed:local
cd ..
```

Critère : les migrations `0000` à `0034`, notamment `0033_extension_registry.sql` et `0034_stock_profitability.sql`, sont marquées `✅`.

Créer un administrateur local. Le script affiche un mot de passe et une clé API : les stocker dans votre gestionnaire de mots de passe, jamais dans le dépôt.

```bash
cd cod-client-astro
npm run seed:admin -- "CHOISIR_UN_MOT_DE_PASSE_LOCAL_FORT"
cd ..
```

## 5. Jeu de démo : 20 commandes et 3 retours

À la racine :

```bash
node extensions/stock-profitability/seed-demo.mjs
cd cod-server
node scripts/d1.mjs execute --local --persist-to ../.wrangler-shared --file ../extensions/stock-profitability/seed-demo.sql
node scripts/d1.mjs execute --local --persist-to ../.wrangler-shared --file ../extensions/stock-profitability/verify-demo.sql
cd ..
```

Le générateur réécrit `seed-demo.sql` et `expected-demo.json` de manière déterministe. Après régénération, vérifier qu’il n’y a pas de différence :

```bash
git diff --exit-code -- extensions/stock-profitability/seed-demo.sql extensions/stock-profitability/expected-demo.json
```

Comparer la sortie SQL brute de `verify-demo.sql` aux valeurs suivantes.

### Comptages

| Mesure | Attendu |
|---|---:|
| Commandes | 20 |
| Commandes retournées | 3 |
| Commandes livrées | 17 |
| Mouvements | 22 |
| Stock final variante `bepro-p-01-v-1` | 13 |
| Unités retournées revendables | 4 |
| Unités retournées non revendables | 2 |
| Dépenses globales | 10000 |

### Commandes livrées

| Mesure | Attendu |
|---|---:|
| `revenue` | 100550 |
| `cogs` | 50900 |
| `gross_margin` | 49650 |
| `delivery_charged` | 6800 |
| `delivery_cost` | 4250 |
| `net_profit` | 49650 |
| Taux de marge de l’API | 49,38 % |

### Commandes retournées

| Mesure | Attendu |
|---|---:|
| `revenue` | 0 |
| `cogs` | 0 |
| `gross_margin` | 0 |
| `delivery_charged` | 1200 |
| `delivery_cost` | 750 |
| `net_profit` | -900 |
| Taux de marge de l’API | 0 % |

Net opérationnel attendu après dépenses : `49650 - 900 - 10000 = 38750` si l’on additionne explicitement livrées et retournées. **Point à vérifier :** l’implémentation actuelle de `/stats?basis=delivered` retourne `operationalNet=39650`, car elle exclut les retours de la base `delivered` et calcule `49650 - 10000`. Le seed attendu conserve `-900` séparément. Ce choix de présentation doit être confirmé ou corrigé avant de considérer les statistiques globales comme définitivement validées.

## 6. API locale

Dans un premier terminal :

```bash
npm run dev --workspace cod-server -- --ip 0.0.0.0
```

Attendre `Ready on http://0.0.0.0:8787`. Définir localement la clé obtenue avec `seed:admin` :

```bash
# macOS / Linux / Git Bash
export BEPRO_API_KEY='COLLER_LA_CLE_LOCALE'
# PowerShell : $env:BEPRO_API_KEY='COLLER_LA_CLE_LOCALE'
```

Git Bash / Linux / macOS :

```bash
curl -i http://localhost:8787/api/extensions -H "X-API-Key: $BEPRO_API_KEY"
curl -i 'http://localhost:8787/api/extensions/stock-profitability/inventory' -H "X-API-Key: $BEPRO_API_KEY"
curl -i 'http://localhost:8787/api/extensions/stock-profitability/stats?from=2026-11-01&to=2026-11-30&basis=delivered' -H "X-API-Key: $BEPRO_API_KEY"
curl -i 'http://localhost:8787/api/extensions/stock-profitability/movements' -H "X-API-Key: $BEPRO_API_KEY"
curl -i 'http://localhost:8787/api/extensions/stock-profitability/reports/inventory.csv' -H "X-API-Key: $BEPRO_API_KEY"
curl -i 'http://localhost:8787/api/extensions/stock-profitability/reports/stats.pdf?from=2026-11-01&to=2026-11-30&basis=delivered' -H "X-API-Key: $BEPRO_API_KEY" --output rapport-stock-local.pdf
```

Sous PowerShell, utiliser `curl.exe` plutôt que l’alias `curl`. Ne pas enregistrer la clé dans les captures ou rapports.

Critères : HTTP `200`, registre avec `stock-profitability`, stock final `13`, statistiques conformes au tableau, CSV non vide et PDF lisible. Vérifier aussi une requête sans clé : elle doit être refusée (`401`).

## 7. Dashboard et captures

Dans un second terminal :

```bash
npm run preview --workspace cod-client-astro -- --host 0.0.0.0 --port 4321
```

Ouvrir `http://localhost:4321/sign-in`, se connecter avec l’administrateur local, puis :

1. `/extensions` : activer/désactiver et configurer l’extension, vérifier les journaux ;
2. `/extensions/stock-profitability` : vérifier KPI, graphiques, inventaire, seuils, filtres et mouvements ;
3. tester un ajustement manuel et constater le nouveau mouvement ;
4. tester ajout/suppression d’une dépense ;
5. tester l’import CSV avec un SKU valide puis un SKU inconnu (`422` attendu) ;
6. désactiver l’extension et vérifier que ses routes répondent `404`, puis la réactiver ;
7. produire des captures desktop et mobile sans identifiants visibles.

## 8. Critères avant fin du WIP

Restent obligatoires : typechecks et builds reproduits sur votre PC, tests noyau, cycle complet création → décrément → livraison/retour/reprise, import/export, alertes et registre, E2E navigateur, captures desktop/mobile, vérification multi-boutique, revue du rollback et résolution du point `operationalNet` ci-dessus. Aucun déploiement distant ne fait partie de cette procédure.
