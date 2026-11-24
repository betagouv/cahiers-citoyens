# Phase 10 : mise en service avec Condorcet

[← Vue d'ensemble](overview.md)

## Objectif

Condorcet dépose son premier vrai cahier et le voit publié, avec le déroulé complet de la section 8 du protocole.

## Changements

- Créer une clé S3 Condorcet : écriture sur `incoming/`, lecture sur `reports/`, rien d'autre. Si le fournisseur ne sait pas limiter une clé par préfixe, un bucket de dépôt séparé.
- Compléter la section « Transmission » du protocole : délai de traitement, contact.
- Écrire un runbook interne : relancer un dépôt `failed`, lire un rapport, retirer un cahier avec `ingest withdraw`.

## Données

Aucune.

## Vérification

- Exécution : l'essai à un cahier de la section 8 du protocole en recette, puis en production. Chaque point de la liste est coché, avec une preuve rangée dans `verify-notebooks/evidence/`.
