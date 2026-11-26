# Phase 2 : types du domaine et parseur du JSON Condorcet

[← Vue d'ensemble](overview.md)

## Objectif

Transformer le JSON d'un cahier, au format de Condorcet, en type du domaine, ou en erreurs localisées (cahier, fichier, page). Pas d'E/S : uniquement des fonctions pures.

## Changements

- `src/ingestion/schemas/notebook.schema.json` : le schéma JSON du protocole. Il fait foi.
- `src/ingestion/condorcet-notebook.ts` : forme brute du JSON (champs en français) et conversion vers le type du domaine (en anglais). Seul ce module connaît les noms de champs de Condorcet.
- `src/ingestion/notebook-checks.ts` : contrôles hors schéma. `id_cahier` reprend le nom du fichier, les numéros de page croissent strictement (trous admis), `id_page` vaut `<id_cahier>_<numero_page>`, chaque `id_ligne` commence par `<id_page>_`.
- `src/ingestion/parse-notebook.ts` : lecture du JSON, validation Ajv, contrôles, puis conversion.
- `src/ingestion/fingerprint.ts` : empreinte d'un cahier.
- Tests sur l'exemple du protocole et sur un cas invalide par règle.

## Données

- `NotebookId` : type string marqué (branded), validé sur le nom du fichier JSON sans `.json`.
- `Notebook { id; schemaVersion; metadata; pages }`, avec `metadata { department; departmentCode; municipality; inseeCode; postalCode; typedTranscription; handwrittenTranscription }`, `Page { number; id; width; height; lines }` et `Line { id; kind: "handwritten" | "typed"; zone: string | null; text; polygon }`. La zone `non renseigné` devient `null`.
- `Fingerprint` : type string marqué. SHA-256 des métadonnées, des numéros et dimensions des pages, de l'empreinte de chaque image et des lignes (texte, type, zone, polygone). `schema_version`, les identifiants de page et de ligne, les noms de fichiers et les dates en sont exclus.
- `IngestError { notebook?; file?; page?; position?; code; message }`. `code` est une liste fermée déclarée `as const`, reprise telle quelle dans le rapport. `position` désigne le rang de la page dans la liste, `page` son numéro déclaré quand il est valide (ajouté en phase 4, où les erreurs d'image ne connaissent que le numéro).

## Vérification

- Statique : `check`, `lint`, `test`.
- Exécution : n/a (code pur). Les tests rejouent l'exemple du protocole. L'empreinte reste la même quand l'ordre des clés JSON change ou quand le même contenu est rezippé, et elle change dès qu'une métadonnée, une ligne ou une image change.
