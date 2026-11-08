# Extension Stock & Rentabilité

> Statut : **WIP**. Les validations reproductibles sur un poste de développement sont décrites dans [`docs/VALIDATION-LOCALE.md`](../../docs/VALIDATION-LOCALE.md). Ne pas déployer en production avant cette validation.

## Périmètre

L’extension ajoute, sans modifier le schéma métier historique des commandes :

- inventaire des produits simples et variantes, prix d’achat/vente, fournisseurs et seuils ;
- mouvements de stock et décrément configurable à la commande, confirmation ou expédition ;
- comportement `block` ou `warn` à stock nul, et retours revendables configurables ;
- snapshots des coûts des commandes et lignes à `order.created` ;
- chiffre d’affaires, COGS, marge brute, frais de livraison, bénéfice net et dépenses ;
- statistiques par produit, catégorie, wilaya, transporteur et jour ;
- exports CSV et PDF, import CSV simple de l’inventaire ;
- registre d’extension avec activation, configuration et journaux ;
- pages dashboard `/extensions` et `/extensions/stock-profitability`.

## Fichiers principaux

- `manifest.json` : métadonnées, événements et schéma de configuration ;
- `server/listener.ts` : snapshots et mouvements liés au cycle de commande ;
- `server/routes.ts` : API inventaire, mouvements, dépenses, statistiques et rapports ;
- `server/money.ts` : formules financières pures ;
- `dashboard/StockProfitabilityPageApp.tsx` : interface React ;
- `tests/money.test.mjs` : tests unitaires des formules ;
- `seed-demo.mjs` : génère le seed SQL et les résultats attendus ;
- `seed-demo.sql`, `expected-demo.json` : démo déterministe de 20 commandes ;
- `../../cod-server/src/db/migrations/0033_extension_registry.sql` : registre ;
- `../../cod-server/src/db/migrations/0034_stock_profitability.sql` : tables propres à l’extension.

Les pages sont montées dans `cod-client-astro/src/pages/extensions/`. Le Worker monte les routes dans `cod-server/src/index.ts`.

## Configuration

| Clé | Valeurs | Défaut | Effet |
|---|---|---|---|
| `deductionTiming` | `order`, `confirmed`, `dispatched` | `order` | Événement de décrément |
| `stockZeroBehavior` | `block`, `warn` | `block` | Refuse ou journalise un stock insuffisant |
| `restockOnReturn` | booléen | `true` | Autorise la reprise des unités revendables |
| `profitBasis` | `delivered`, `forecast` | `delivered` | Base du rapport de rentabilité |
| `lowStockAlert` | booléen | `true` | Active les événements de seuil |
| `lowStockEmail` | booléen | `false` | Réservé à l’envoi d’e-mails, non configuré sans fournisseur |
| `defaultPackagingFee` | nombre ≥ 0 | `0` | Frais d’emballage par défaut |
| `defaultConfirmationFee` | nombre ≥ 0 | `0` | Frais de confirmation par défaut |
| `defaultAdCost` | nombre ≥ 0 | `0` | Coût publicitaire par défaut |

L’activation et la configuration sont cloisonnées par boutique dans le registre. Si l’extension est désactivée, ses routes répondent `404` et son listener ne modifie pas les commandes.

## Règles financières

Les montants sont calculés en unités monétaires entières pour le seed. Les pourcentages sont arrondis à deux décimales.

- `revenue = somme(prix de vente × quantité conservée − remise proratisée)` ;
- `COGS = somme(coût unitaire figé × quantité conservée)` ;
- `marge brute = revenue − COGS` ;
- `bénéfice net = marge brute + livraison facturée − coût de livraison − frais de retour − confirmation − emballage − publicité − autres frais` ;
- `net opérationnel = bénéfice net − dépenses de la période` ;
- `taux de marge = bénéfice net / revenue × 100`, ou `0` si le revenu est nul.

Une commande entièrement retournée a `revenue = COGS = marge brute = 0`, tout en conservant ses frais. Le panier moyen affiché inclut le montant des lignes et la livraison facturée, divisé par les commandes retenues dans la base de rentabilité.

## API

Préfixe : `/api/extensions/stock-profitability`.

- `GET /inventory`, `PATCH /inventory/:productId` ;
- `GET /products/:productId`, `GET /movements` ;
- `GET /stats?from=YYYY-MM-DD&to=YYYY-MM-DD&basis=delivered|forecast` ;
- `GET|POST /expenses`, `DELETE /expenses/:id` ;
- `GET /reports/inventory.csv`, `GET /reports/stats.pdf` ;
- `POST /inventory/import`.

Les routes de registre communes sont sous `/api/extensions`. L’authentification et les scopes produits du noyau sont requis.

### Import CSV

En-tête : `sku,quantity,threshold,costPrice`. Une ligne par SKU ; l’import calcule le delta de stock, ajoute un mouvement d’ajustement, met à jour le seuil et le coût. Les SKU inconnus sont retournés dans `errors` avec une réponse `422`. Ce parseur simple n’accepte pas de virgule échappée dans une cellule.

## Démo déterministe

Depuis la racine du dépôt :

```bash
node extensions/stock-profitability/seed-demo.mjs
node cod-server/scripts/d1.mjs execute --local --persist-to ../.wrangler-shared --file extensions/stock-profitability/seed-demo.sql
```

Résultats attendus : 20 commandes, 17 livrées, 3 retournées, 22 mouvements, stock final de la variante démo égal à 13. Les valeurs détaillées sont dans `expected-demo.json` et la procédure de comparaison SQL dans `docs/VALIDATION-LOCALE.md`.

## Rollback

Le rollback est logique et manuel : désactiver l’extension dans `/extensions`, sauvegarder la base, puis retirer le montage du listener et des routes avant de supprimer les tables `ext_sp_*` et `extension_*` dans une migration de rollback dédiée. Ne pas supprimer les tables avant export et sauvegarde. Aucun rollback destructif automatique n’est fourni dans ce WIP.
