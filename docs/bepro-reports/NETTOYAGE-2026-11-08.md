# Diagnostic et nettoyage du workspace — 8 novembre 2026

## Diagnostic initial

```text
Taille initiale : 130 Mo
Fichiers hors node_modules/.git : 1 781
Fichiers de plus de 50 Mo : aucun
Dépôts Git imbriqués : aucun
```

Les éléments dominants étaient les états `.wrangler`, les traces Miniflare et l’historique `.git`.

Des fichiers `.env` et `.dev.vars` locaux ont été détectés. Leurs valeurs n’ont pas été affichées ni commitées. Aucun secret local n’a été détecté dans l’index Git.

## Push initial vérifié

```text
a306f11 chore: initial commit bepro
GIT_PUSH_EXIT=0
a306f118da10994e086c7b298ac0e311346f91a1 refs/heads/main
```

Dépôt : https://github.com/ecomto360-spec/Bepro.git

L’authentification utilise une deploy key SSH en lecture/écriture. Aucune clé privée ou aucun token ne se trouve dans le dépôt.

## Nettoyage réalisé après vérification du push

Suppression des éléments suivants, y compris dans les sous-dossiers :

- `node_modules`, `.next`, `dist`, `.astro`, `.wrangler`, `.wrangler-shared`, `.output` ;
- `.npm`, `.cache`, `__pycache__` ;
- `test-results`, `playwright-report` ;
- logs et anciennes captures de phase 0 ;
- diff et rapports Lighthouse générés, régénérables à la demande.

```text
Taille avant nettoyage : 138 Mo
Taille après nettoyage : 42 Mo avec .git
Taille du répertoire de travail hors .git : 18 Mo
Fichiers hors .git : 1 600
Fichiers source suivis après suppressions : 1 593
```

## Limites restantes

L’objectif de moins de 30 Mo au total n’est pas atteint sans réécrire l’historique : `.git` occupe environ 24 Mo et contient les anciens artefacts CodFlow déjà historisés. Le répertoire de travail, lui, fait environ 18 Mo.

L’objectif de moins de 1 000 fichiers n’est pas atteint : le noyau CodFlow et ses interfaces contiennent à eux seuls plus de 1 400 fichiers source. Aucun fichier fonctionnel n’a été supprimé uniquement pour réduire ce compteur.

Une réécriture/orphanisation de l’historique pourrait réduire `.git`, mais elle n’est pas effectuée sans autorisation explicite.

## Règles appliquées

Le `.gitignore` exclut les dépendances, builds, états Wrangler, caches, environnements et logs. `.env.example` ne contient que des noms de variables avec des valeurs vides.

Pour les prochains tests, les dépendances seront installées hors du workspace persistant, puis supprimées à la fin de la tâche.
