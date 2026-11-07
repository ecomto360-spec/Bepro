# bepro — Rapport de phase 0 : base CodFlow locale

Date : 2026-11-07  
Dépôt source : `https://github.com/bighadj22/codflow.git`  
Commit de départ : `ed79aa9 Merge pull request #139 from konouzdz19-dot/fix/editor-and-storefront-word-wrap`  
Répertoire dans cet environnement : `/home/user/bepro`

Le chemin Windows `E:\SOFTWARE\Projet web\bepro` n'est pas monté dans l'environnement d'exécution. Le workspace était vide au démarrage ; aucun travail antérieur n'a été écrasé.

## Documentation lue

- `README.md`
- `CHANGELOG.md`
- `AGENTS.md`
- `.agents/skills/codflow-setup/SKILL.md`
- `cod-client-astro/README.md`
- `cod-astro/theme01/README.md`
- `cod-astro/theme01/AGENTS.md`

Le dashboard retenu est `cod-client-astro`. La vitrine retenue est `cod-astro/theme01`. Aucun dashboard Next.js n'est utilisé ; sa suppression est d'ailleurs enregistrée dans le changelog courant.

## Environnement et installation

Node fourni initialement : `v20.20.2`, incompatible avec l'exigence du dépôt `>=22.12.0`.  
Node installé pour le projet : `v22.23.4`.  
npm utilisé : `10.8.2`.

Sortie initiale :

```text
$ node --version && npm --version
v20.20.2
10.8.2

$ npm ci
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   required: { node: '>=22.12.0' },
npm warn EBADENGINE   current: { node: 'v20.20.2', npm: '10.8.2' }
npm warn EBADENGINE }
...
added 1109 packages, and audited 1119 packages in 43s
63 vulnerabilities (3 low, 32 moderate, 26 high, 2 critical)
```

Les réinstallations suivantes ont été tuées par manque de mémoire. Un swap temporaire de 2 Gio a été ajouté à l'environnement, sans modification du dépôt. Installation finale :

```text
Setting up swapspace version 1, size = 2 GiB (2147479552 bytes)
v22.23.4
10.8.2

added 1109 packages, and audited 1119 packages in 28s

270 packages are looking for funding
  run `npm fund` for details

63 vulnerabilities (3 low, 32 moderate, 26 high, 2 critical)
```

Aucun `npm audit fix --force` n'a été lancé : il pourrait modifier les versions verrouillées et introduire des ruptures hors du périmètre de la phase 0.

Vérification du module natif et de Vite :

```text
{ ok: 1 }

codflow@ /home/user/bepro
+-- cod-astro-theme01@1.1.0 -> ./cod-astro/theme01
| `-- vite@8.2.2 deduped
+-- codflow-client-astro@1.1.0 -> ./cod-client-astro
| `-- vite@8.2.2 deduped
`-- codflow-server@1.1.0 -> ./cod-server
  `-- vite@8.2.2 deduped
```

## Initialisation D1 et seed

Commande :

```sh
cd cod-server
npm run db:setup:local
```

Extraits bruts :

```text
🌀 Executing on local database codflow-os-db (00000000-0000-0000-0000-000000000000) from ../.wrangler-shared/v3/d1:
🚣 1668 commands executed successfully.
...
🚣 2 commands executed successfully.

[seed-local] ✓ 18/18 statements executed

  store      : store-local-dev (متجر التطوير)
  categories : 2
  products   : 4 (3 featured)
  variants   : 4
  images     : 6

[seed-store-pages] ✓ 16/16 statements executed
  store  : store-local-dev (متجر التطوير)
  pages  : 4 kinds × 3 locales
  target : local D1 (.wrangler-shared)
```

## Échecs rencontrés et corrections

### 1. Version de Node incompatible

- Preuve : avertissements `EBADENGINE` pour Astro, Vitest, Wrangler, better-sqlite3 et le dépôt.
- Correction : utilisation de Node `v22.23.4` pour toutes les commandes du projet.

### 2. `npm ci` tué par l'environnement

- Preuves : `/bin/bash: ... Killed npm ci`, puis codes `137` pendant les vérifications Astro.
- Cause environnementale : environ 1,3 Gio disponible et aucun swap pendant l'installation ; trois serveurs de développement actifs pendant les premières vérifications.
- Correction : swap temporaire de 2 Gio, arrêt des serveurs pendant les builds, heap Node réglé à 1536 Mo pour le typecheck/build du dashboard.

### 3. Seed admin : nom D1 différent

Sortie brute :

```text
ERROR Couldn't find a D1 DB with the name or binding 'codflow-os-db' in your wrangler.toml file.
npm error Lifecycle script `seed:admin` failed with error:
```

- Cause : `cod-server/wrangler.toml.example` utilise `codflow-os-db`, le template dashboard utilise `codflow-db`.
- Correction locale : `database_name = "codflow-os-db"` dans `cod-client-astro/wrangler.toml`.

### 4. Seed admin : base locale distincte

Sortie brute :

```text
ERROR no such table: users: SQLITE_ERROR
🌀 Executing on local database codflow-os-db (<your-d1-database-id>) from ../.wrangler-shared/v3/d1:
```

- Cause : le `database_id` du dashboard différait de celui du serveur, créant une seconde base SQLite locale.
- Correction locale : alignement sur `00000000-0000-0000-0000-000000000000`, identique au serveur. Ces identifiants sont uniquement des placeholders locaux ; aucun déploiement distant n'est effectué avec eux.

Seed final :

```text
🌀 Executing on local database codflow-os-db (00000000-0000-0000-0000-000000000000) from ../.wrangler-shared/v3/d1:
🚣 4 commands executed successfully.

╔══════════════════════════════════════════════════════════╗
║                 Admin user seeded                       ║
╠══════════════════════════════════════════════════════════╣
║  Email    : admin@bepro.local                            ║
║  Role     : admin                                        ║
╚══════════════════════════════════════════════════════════╝
```

Le mot de passe local et la clé API sont conservés dans `/home/user/bepro-local-credentials.md`, hors dépôt, avec permissions `600`.

### 5. API : URL OAuth locale refusée

Sortie brute :

```text
TypeError: resourceMetadata.authorization_servers must contain valid HTTPS issuer URLs
    at OAuthProviderImpl.validateResourceMetadataOptions
    at getOAuthProvider (file:///home/user/bepro/cod-server/src/index.ts:193:29)
HTTP 500
```

- Cause : `WORKER_SELF_URL=http://localhost:8787/` alimente `authorization_servers`, dont le validateur exige HTTPS.
- Correction locale : `WORKER_SELF_URL=https://localhost:8787/` dans `cod-server/.dev.vars`. Cette valeur concerne les métadonnées OAuth locales ; les requêtes HTTP locales restent adressées à `http://localhost:8787`.
- Preuve après correction : `/api/docs`, `/store/config` et `/store/products` répondent `200`.

### 6. Dashboard : réoptimisation SSR Vite

Sortie brute :

```text
The file does not exist at "/home/user/bepro/cod-client-astro/node_modules/.vite/deps_ssr/route-cache-BjPAcRDO.js" which is in the optimize deps directory.
npm error Lifecycle script `dev` failed with error:
```

- Correction suivie dans le code : désactivation de la découverte tardive SSR et exclusion du service d'images noop dans `cod-client-astro/astro.config.mjs`.
- Preuve après correction : le serveur démarre, `/sign-in` et l'authentification avec `Origin` répondent `200`, le typecheck et le build aboutissent.

Diff :

```diff
diff --git a/cod-client-astro/astro.config.mjs b/cod-client-astro/astro.config.mjs
@@ -74,6 +74,14 @@ export default defineConfig({
     appType: "spa",
     plugins: [orderDetailFallback, tailwindcss()],
+    environments: {
+      ssr: {
+        optimizeDeps: {
+          noDiscovery: true,
+          exclude: ["astro/assets/services/noop"],
+        },
+      },
+    },
     resolve: {
```

## Build et typecheck

Sorties complètes, sans réécriture :

- `logs/phase-0-build-typecheck.log` — premier essai, incluant les échecs mémoire et la réussite des builds serveur/vitrine.
- `logs/phase-0-dashboard-verification-retry.log` — essai avec heap de 1024 Mo insuffisant.
- `logs/phase-0-dashboard-verification-final.log` — vérification finale du dashboard.

Résultat final :

```text
Result (481 files):
- 0 errors
- 0 warnings
- 21 hints

[build] Server built in 6.50s
[build] Complete!
```

Build serveur :

```text
Total Upload: 4176.65 KiB / gzip: 779.39 KiB
--dry-run: exiting now.
```

Build vitrine :

```text
✓ Successfully compressed a total of 26 JavaScript files for 164 Bytes.
[build] Server built in 3.39s
[build] Complete!
```

Les avertissements de taille de chunks dashboard et les 21 hints préexistants restent documentés ; ils ne sont pas des erreurs de compilation.

## Vérification HTTP finale

Sortie brute enregistrée dans `logs/phase-0-curl-final.log` :

```text
$ curl http://localhost:8787/api/docs
HTTP 200

$ curl -H "X-Store-API-Key: <clé locale>" http://localhost:8787/store/config
HTTP 200
{
  "success": true,
  "store": "متجر التطوير",
  "cartEnabled": false
}

$ curl -H "X-Store-API-Key: <clé locale>" http://localhost:8787/store/products
HTTP 200
Produits reçus: 4

$ curl http://localhost:4321/sign-in
HTTP 200

$ curl -X POST http://localhost:4321/api/auth/sign-in/email -H "Origin: http://localhost:4321" ...
HTTP 200
{
  "email": "admin@bepro.local",
  "role": "admin",
  "status": "active"
}

$ curl http://localhost:4322/
HTTP 200

$ curl http://localhost:4322/products
HTTP 200
```

## Captures de l'état CodFlow de départ

- [Vitrine desktop](captures/phase-0/storefront-desktop.png)
- [Vitrine mobile 390 px](captures/phase-0/storefront-mobile-390.png)
- [Dashboard desktop](captures/phase-0/dashboard-signin-desktop.png)
- [Dashboard mobile 390 px](captures/phase-0/dashboard-signin-mobile-390.png)

Ces captures montrent volontairement le thème et le catalogue CodFlow d'origine, pas encore la reproduction bepro/PROMOBI.

## Fichiers modifiés ou créés

Suivis par Git :

- `cod-client-astro/astro.config.mjs` — stabilisation du SSR Vite.
- `docs/bepro-reports/PHASE-0.md` — présent rapport.
- `docs/bepro-reports/logs/phase-0-*.log` — preuves terminales.
- `docs/bepro-reports/captures/phase-0/*.png` — captures desktop/mobile.

Locaux, ignorés par Git :

- `.env`
- `cod-server/.dev.vars`
- `cod-server/wrangler.toml`
- `cod-client-astro/.env`
- `cod-client-astro/.dev.vars`
- `cod-client-astro/wrangler.toml`
- `cod-astro/theme01/.dev.vars`
- `.wrangler-shared/`

Hors dépôt :

- `/home/user/bepro-local-credentials.md` — identifiants locaux, permissions `600`.

## Points bloquants et limites de phase

- Aucun accès au disque Windows `E:` depuis cet environnement.
- Aucun identifiant Cloudflare/client fourni : aucune ressource distante créée et aucun déploiement effectué.
- Les identifiants D1/KV actuels sont uniquement des placeholders pour l'émulation locale.
- Le catalogue, la langue par défaut et le panier sont encore ceux de CodFlow : 4 produits, arabe, panier désactivé. Leur adaptation appartient aux phases suivantes.
- Les variables `[BEPRO_*]`, le catalogue réel et les clés transporteurs restent à fournir.
- Les 63 vulnérabilités rapportées par npm audit ne sont pas corrigées automatiquement ; une analyse ciblée est nécessaire avant toute mise à jour de la lockfile.

## Services locaux

- API : `http://localhost:8787`
- Dashboard Astro : `http://localhost:4321/sign-in`
- Vitrine Astro SSR : `http://localhost:4322`

La phase 1 n'est pas commencée. Elle attend la validation de cette phase 0.
