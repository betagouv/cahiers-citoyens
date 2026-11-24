# Phase 6 : planification et application des changements

[← Vue d'ensemble](overview.md)

## Objectif

Transformer un `VerifiedDelivery` en changements, puis les appliquer de façon atomique et idempotente. Ajouter la commande de retrait.

## Changements

- `src/ingestion/plan.ts` (pur). Compare l'empreinte de chaque cahier du dépôt à celle de sa version en ligne :
  - cahier inconnu : publié ;
  - même empreinte : rien ;
  - empreinte différente : remplacé ;
  - cahier retiré : publié de nouveau.
- `src/ingestion/apply.ts` :
  1. copie les PNG vers `notebooks/<id>/v<version>/`. La clé est déterministe : une copie interrompue peut être relancée sans risque ;
  2. dans une seule transaction, il ajoute les versions, met à jour `notebooks`, remplace `pages` et `chunks`, puis passe le dépôt à `applied` ;
  3. après le commit seulement, il supprime les fichiers des versions remplacées.
- `withdraw(id, reason)` : passe le cahier à `withdrawn` (il disparaît du site et de la recherche), puis supprime ses fichiers servis. Exposé par la commande `ingest withdraw`.
- Le découpage en chunks se fait par page, puis par contribution à l'intérieur de la page. C'est une évolution de `scripts/chunk.ts`, qui passe dans `src/ingestion/`.

## Données

- `ChangePlan { delivery; changes: Change[] }`, avec `Change = Publish | Replace | Republish | Unchanged`. Chaque variante sait quels fichiers elle ajoute et lesquels elle retire.

## Vérification

- Statique : `check`, `lint`, `test`. Les tests de `plan` couvrent chaque combinaison d'empreinte et d'état courant.
- Exécution : contre Postgres en local, appliquer deux fois le même dépôt, puis le même contenu rezippé, puis un dépôt avec un arrêt brutal entre la copie des fichiers et la transaction. L'état final doit être identique à chaque fois.
- `interrogate` avant merge.
