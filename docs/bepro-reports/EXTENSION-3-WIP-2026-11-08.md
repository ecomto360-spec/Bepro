# Rapport WIP — Extension 3 Stock & Rentabilité

Date : 2026-11-08. Statut : **code publié, validation finale locale requise**. Ne pas interpréter ce rapport comme une validation de production.

## Publication

- Dépôt : `https://github.com/ecomto360-spec/Bepro.git` ;
- branche : `main` ;
- commit fonctionnel : `5e00b15` — `feat(stock): extension stock et rentabilité (WIP)` ;
- merge avec la base distante `c0f35ef` : `e6f514d` ;
- preuve distante obtenue :

```text
To github.com:ecomto360-spec/Bepro.git
   c0f35ef..e6f514d  main -> main

e6f514d459108da6470659899d62515c7bbfa2a8	HEAD
e6f514d459108da6470659899d62515c7bbfa2a8	refs/heads/main
```

Le premier push a été refusé (`fetch first`) car `origin/main` contenait `c0f35ef`. Un merge normal a été effectué, sans force push ni réécriture d’historique.

## Sources poussées

### Extension et registre

- `extensions/stock-profitability/manifest.json` ;
- `extensions/stock-profitability/server/{money,listener,routes,report}.ts` ;
- `extensions/stock-profitability/dashboard/StockProfitabilityPageApp.tsx` ;
- `extensions/stock-profitability/tests/money.test.mjs` ;
- `extensions/stock-profitability/{seed-demo.mjs,seed-demo.sql,expected-demo.json}` ;
- `extensions/stock-profitability/README.md` ;
- `extensions/shared/server/{registry,events,registry-routes}.ts` ;
- `extensions/shared/dashboard/ExtensionsPageApp.tsx`.

Ajoutés après le premier commit WIP : `verify-demo.sql` et la procédure `docs/VALIDATION-LOCALE.md`.

### Migrations et intégration

- `cod-server/src/db/migrations/0033_extension_registry.sql` ;
- `cod-server/src/db/migrations/0034_stock_profitability.sql` ;
- `cod-server/src/index.ts` ;
- handlers commandes/boutique et transitions de statut ;
- `cod-shared/queries/{orders,store}.ts` ;
- `cod-client-astro/src/pages/extensions/{index,stock-profitability}.astro` ;
- navigation dashboard et `cod-client-astro/astro.config.mjs` (`server.allowedHosts=true`).

Le commit WIP contient aussi les modifications de boutique et de nettoyage qui étaient déjà présentes dans le workspace au moment du `git add -A` demandé. Le détail exact est disponible avec :

```bash
git show --stat --oneline 5e00b15
git diff c0f35ef..HEAD --name-status
```

La copie `/tmp/bepro-run` n’existait plus au moment de la comparaison demandée. Sortie brute représentative :

```text
diff: /tmp/bepro-run/cod-client-astro/astro.config.mjs: No such file or directory
diff: /tmp/bepro-run/extensions: No such file or directory
```

La configuration `server.allowedHosts=true` est bien présente dans le dépôt.

## Vérifications déjà obtenues — sorties brutes

Ces sorties ont été obtenues avant l’arrêt demandé des builds et serveurs Arena. Elles ne remplacent pas la reproduction sur le PC.

### Tests des formules

```text
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 146.066097
```

### Preuve SQL du seed

```text
counts: SQL=(20, 3, 22) | EXPECTED=(20, 3, 22) | MATCH=True
delivered: SQL=(17, 100550.0, 50900.0, 49650.0, 6800.0, 4250.0, 49650.0) | EXPECTED=(17, 100550.0, 50900.0, 49650.0, 6800.0, 4250.0, 49650.0) | MATCH=True
returned: SQL=(3, 0.0, 0.0, 0.0, 1200.0, 750.0, -900.0) | EXPECTED=(3, 0.0, 0.0, 0.0, 1200.0, 750.0, -900.0) | MATCH=True
returns_stock: SQL=(4, 2) | EXPECTED=(4, 2) | MATCH=True
expenses: SQL=(10000.0,) | EXPECTED=(10000.0,) | MATCH=True
inventory: SQL=(13,) | EXPECTED=(13,) | MATCH=True
SQL_EXPECTED_MATCH=OK
```

### Migrations D1 locales

```text
│ 0032_whatsapp_widget.sql                   │ ✅     │
│ 0033_extension_registry.sql                │ ✅     │
│ 0034_stock_profitability.sql               │ ✅     │
```

Le journal antérieur contient 35 migrations et 1668 commandes réussies. Aucune migration distante n’a été exécutée.

### Build Astro

```text
14:22:37   ├─ /extensions/stock-profitability/index.html (+255ms)
14:22:37   ├─ /extensions/index.html (+360ms)
14:22:43 [build] Server built in 14.45s
14:22:43 [build] Complete!
```

### Dry-run Worker

```text
Total Upload: 4221.71 KiB / gzip: 790.44 KiB
--dry-run: exiting now.
```

### Typechecks ciblés

Les deux commandes ciblées ont retourné le code `0` et leurs journaux sont vides, donc aucun diagnostic TypeScript à citer. Il ne s’agit pas des commandes `npm run typecheck` complètes demandées dans la nouvelle procédure PC.

### Appels API obtenus avant arrêt

Registre :

```text
{"success":true,"data":[{"id":"stock-profitability","name":"Stock & rentabilité","version":"1.0.0","enabled":true,...}]}
HTTP=200
```

Statistiques :

```text
"totals":{"revenue":100550,"cogs":50900,"grossMargin":49650,"deliveryCharged":6800,"deliveryCost":4250,"netProfit":49650,"expenses":10000,"operationalNet":39650,"marginPercent":49.38,"orders":20,"averageBasket":6314.71,"confirmationRate":100,"deliveryRate":85,"returnRate":15}
HTTP=200
```

Aucune clé API n’est reproduite dans ce rapport.

## Reste à valider sur le PC

La procédure complète et les résultats attendus sont dans [`docs/VALIDATION-LOCALE.md`](../VALIDATION-LOCALE.md).

- `npm ci`, typechecks complets, builds et tests noyau ;
- migrations et seed sur une D1 locale propre ;
- création → confirmation/expédition → livraison/retour/reprise de stock ;
- import/export CSV, PDF, dépenses, alertes et registre ;
- comportement à extension désactivée (`404`) et isolation multi-boutique ;
- E2E navigateur et captures desktop/mobile ;
- rollback sauvegardé et documenté ;
- clarifier `operationalNet=39650` sur la base `delivered` : les trois retours (`-900`) sont exclus de cette base, alors que leur total séparé reste vérifiable ;
- revue complète du diff WIP avant toute validation finale.

Aucune capture desktop/mobile de l’extension, aucun E2E de l’extension et aucun déploiement distant ne sont déclarés validés.

## Arrêt de l’environnement Arena

Après la consigne STOP, la vérification des processus a produit :

```text
=== PROCESSUS WRANGLER/ASTRO/ESBUILD RESTANTS ===
```

Aucune ligne ne suit : aucun serveur Wrangler/Astro ni esbuild actif. Aucun `npm install/ci`, build ou serveur n’a été relancé après cette consigne.
