# Phase 1 : exécuter un job TypeScript sur Scalingo

[← Vue d'ensemble](overview.md)

## Objectif

Prouver qu'un job écrit en TypeScript, qui importe `src/db` et `src/lib`, tourne en production dans un conteneur cron Scalingo. On lève ce risque avant d'écrire la moindre logique d'ingestion.

## Changements

- Ajouter une étape de compilation des jobs (esbuild, tout dans un seul fichier) au script `build`. Elle produit `dist/jobs/<nom>.mjs`, lancé par `node`.
- Ajouter `cron.json` avec un job `ingest` qui, pour l'instant, ne fait que se connecter à la base et journaliser une ligne.
- Mettre à jour le README (section déploiement).

## Données

Aucune.

## Vérification

- Statique : `check`, `lint`, `test`, `build`. Vérifier que l'installation passe aussi avec npm.
- Exécution : sur l'app de recette, le cron s'exécute et sa ligne apparaît dans les logs Scalingo. En local, `node dist/jobs/ingest.mjs` tourne contre la base locale.
