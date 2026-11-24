# Phase 2 : types du domaine et parseur de `notebook.json`

[← Vue d'ensemble](overview.md)

## Objectif

Transformer un `notebook.json` en type du domaine, ou en erreurs localisées (cahier, champ, page). Pas d'E/S : uniquement des fonctions pures.

## Changements

- Mettre le schéma JSON du protocole sous `src/ingestion/schemas/notebook.schema.json`. Il fait foi.
- Créer `src/ingestion/notebook.ts` : validation Ajv, puis contrôles hors schéma (pages de 1 à n sans trou ni doublon, une image citée une seule fois), puis conversion vers le type du domaine.
- Créer `src/ingestion/fingerprint.ts` : empreinte d'un cahier, calculée à partir de l'ordre des pages, de l'empreinte de chaque image et de chaque texte.
- Tests sur l'exemple du protocole et sur un cas invalide par règle.

## Données

- `NotebookId` : type string marqué (branded), validé sur le nom du dossier.
- `NotebookManifest { sourceFilename; pipelineRelease; pages: Page[] }`, avec `Page { page; image; text }`.
- `Fingerprint` : type string marqué. Le format, `pipeline_release` et toute date en sont exclus.
- `IngestError { notebook?; file?; page?; code; message }`. `code` est une liste fermée déclarée `as const`, reprise telle quelle dans le rapport.

## Vérification

- Statique : `check`, `lint`, `test`.
- Exécution : n/a (code pur). Les tests rejouent l'exemple du protocole. L'empreinte reste la même quand l'ordre des clés JSON change, et elle change dès qu'un texte ou une image change.
- Passer par `architect` avant de coder : forme des erreurs, et ce qui entre dans l'empreinte.
