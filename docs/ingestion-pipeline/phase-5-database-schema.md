# Phase 5 : schéma de la base

[← Vue d'ensemble](overview.md)

## Objectif

Modéliser les dépôts, les versions successives des cahiers et leur état courant, comme si le protocole avait existé dès le départ.

## Changements

- `src/db/schema.ts` :
  - `deliveries` : nom du ZIP (unique), statut, horodatage de chaque transition, `errors` en jsonb, compteurs (publiés, remplacés, inchangés) ;
  - `notebook_versions` : historique en ajout seul. Contient le cahier, le numéro de version (attribué par nous), le dépôt d'origine, l'empreinte, `source_filename` et `pipeline_release`, le nombre de pages et la date. Unicité sur `(notebook_id, version)` ;
  - `notebooks` : état courant, avec `status` (`published` | `withdrawn`), la version en ligne, et le motif et la date du retrait ;
  - `pages` : `(notebook_id, page, image_key, width, height, text)` pour la version en ligne ;
  - `chunks` : ajoute `page`, pour que la recherche cite une page.
- Supprimer `scan_key`, `transcription_key` et `transcription` de `notebooks` : les pages les remplacent.
- Migration générée par `drizzle-kit`. Les faux cahiers actuels seront rechargés par la pipeline (phase 7), on ne les migre pas.

## Données

- Statut d'un dépôt : `received | verifying | applying | applied | rejected | failed`, déclaré `as const`. Les transitions autorisées sont décrites dans une table, pas dispersées dans des `if`.

## Vérification

- Statique : `check`, `lint`, `test`, et `db:generate` ne produit aucun écart.
- Exécution : `db:migrate` sur une base vide, puis sur une copie de la base de recette.
