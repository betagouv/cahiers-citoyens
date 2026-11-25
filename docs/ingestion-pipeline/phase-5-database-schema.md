# Phase 5 : schéma de la base

[← Vue d'ensemble](overview.md)

## Objectif

Modéliser les dépôts, les versions successives des cahiers et leur état courant, comme si le protocole avait existé dès le départ. Ajouter un référentiel des départements et communes de France, pour la recherche par lieu.

La phase est additive : merger sur `main` déploie en production, et le site comme `scripts/load.ts` lisent encore `notebooks.scan_key`, `transcription_key` et `transcription`. Ces colonnes restent, toujours obligatoires. Leur suppression passe aux phases 7 (fin de `load.ts`) et 8 (pages en images côté site). La phase 6 devra soit les rendre facultatives, soit y écrire une valeur pour les cahiers venus d'un dépôt.

## Changements

- `src/db/schema.ts` :
  - `deliveries` : nom du ZIP (unique), statut, date de chaque statut atteint (`received_at` … `failed_at`), `errors` en jsonb (`IngestError[]`), compteurs `published_count`, `replaced_count`, `unchanged_count` ;
  - `notebook_versions` : historique en ajout seul. Clé primaire `(notebook_id, version)`, dépôt d'origine, empreinte, `schema_version`, nombre de pages, date. Supprimer un cahier qui a des versions est refusé ;
  - `notebooks`, en plus des colonnes existantes : `status` (`published` | `withdrawn`, `published` par défaut pour les cahiers déjà chargés), `online_version` (clé étrangère composite vers `notebook_versions`, vide pour les cahiers de `load.ts`), `withdrawal_reason` (`not_publishable` | `sensitive_content` | `source_correction` | `other`) et `withdrawn_at`. Une contrainte impose motif et date pour un cahier retiré, et aucun pour un cahier publié. Les métadonnées du JSON y sont copiées : `department_name`, `department_code`, `municipality_name`, `insee_code` (le code de 2019, tel que livré), `postal_code`, `typed_transcription` et `handwritten_transcription`. Index sur `department_code` et `insee_code` ;
  - `pages` : `(notebook_id, number)` en clé primaire, les trous de numérotation sont admis. `image_key`, `image_content_type` (`image/jpeg` | `image/png`), `width`, `height`, `text`, et `search`, un tsvector généré (`to_tsvector('french', text)`) indexé en GIN ;
  - `lines` : `(notebook_id, page, position)`, `kind` (`handwritten` | `typed`), `zone` (vide si non renseignée), `text`, `polygon` en jsonb. Supprimées avec leur page ;
  - `chunks` : ajoute `page`, facultative, avec une clé étrangère `(notebook_id, page)` vers `pages`, pour que la recherche cite une page.
- `src/db/geography-schema.ts`, réexporté par `schema.ts` : `departments`, `municipalities` et `municipality_code_history` (voir plus bas).
- Les listes fermées (statuts, motifs, types de ligne, modes de transcription, formats d'image) sont des tableaux `as const` du domaine, repris par des contraintes CHECK (`sqlInList`).
- Migration générée par `drizzle-kit` : `drizzle/0002_ingestion-and-geography.sql`.

### Texte par page et lignes

Le texte est stocké deux fois : par page (`pages.text`, les lignes réunies dans l'ordre) et par ligne (`lines`). La recherche plein texte comptera les pages qui contiennent un mot, par département ou par commune : un tsvector par page répond directement, sans agréger les lignes à chaque requête. Les lignes gardent ce que la page perd : le type d'écriture, la zone et le polygone, utiles pour surligner un passage sur l'image. La phase 6 écrit les deux dans la même transaction.

Compter les pages d'un mot dans un département :

```sql
select count(*)
from pages p
join notebooks n on n.id = p.notebook_id
where p.search @@ plainto_tsquery('french', 'impôts')
  and n.status = 'published'
  and n.department_code = '01';
```

Le GIN de `pages.search` filtre les pages, l'index de `notebooks.department_code` (ou `insee_code`) filtre les cahiers. Un index composite (mot et lieu) demanderait l'extension `btree_gin` ; on attendra d'avoir le volume réel pour juger.

Comme pour `chunks.search`, la configuration `french` garde les accents : « impot » ne trouve pas « impôts ». `unaccent` n'est pas utilisée dans le dépôt pour l'instant ; l'ajouter demande une configuration de recherche dédiée (fonction immuable autour d'`unaccent`), à faire pour `chunks` et `pages` en même temps.

## Données

- Statut d'un dépôt : `received | verifying | applying | applied | rejected | failed`, déclaré `as const` dans `src/ingestion/delivery-status.ts`. Les transitions autorisées sont dans `DELIVERY_TRANSITIONS` ; `canTransition` et `assertTransition` les consultent :

  ```
  received  → verifying | failed
  verifying → applying | rejected | failed
  applying  → applied | failed
  failed    → verifying        (relance au job suivant)
  applied, rejected : terminaux
  ```

  Après une relance, `verifying_at` porte la date de la dernière tentative.

- Statut d'un cahier et motifs de retrait : `src/ingestion/notebook-status.ts`.

## Référentiel géographique

Pour une recherche par lieu qui propose toutes les communes, y compris celles sans cahier publié (« À venir »).

- `departments` : `code`, `name`, `region_code`, depuis `https://geo.api.gouv.fr/departements` (101, outre-mer compris).
- `municipalities` : `insee_code`, `name`, `department_code`, `population` (facultative), `postal_codes` (`text[]`), `search_name`, depuis `https://geo.api.gouv.fr/communes` (environ 35 000 communes actuelles). `search_name` est le nom en minuscules, sans accents ni ponctuation (`toSearchName`, `src/geography/search-name.ts`). Un index btree `text_pattern_ops` sert la recherche par préfixe (`search_name like 'saint et%'`) sans extension : ni `pg_trgm` ni `unaccent` ne sont activées. La saisie passe par le même `toSearchName`. Les collectivités d'outre-mer (975, 984, 986…) ont des communes mais ne sont pas des départements : `department_code` n'a donc pas de clé étrangère.
- `municipality_code_history` : `old_code` → `current_code`. Les cahiers portent le code INSEE de 2019, geo.api les communes actuelles. Source : fichier des événements survenus aux communes du Code officiel géographique de l'Insee, millésime 2026 (`v_mvt_commune_2026.csv`, référencé sur data.gouv.fr). On garde les fusions et changements de code (MOD 31, 32, 33, 41, 50) d'une commune vers une commune, postérieurs au 1er janvier 2019, et on suit chaque chaîne jusqu'à une commune actuelle. Un code encore actuel n'y figure pas. Au premier chargement : 108 anciens codes, tous rattachés.

Chargement : `scripts/load-geography.ts`, compilé au build dans `dist/jobs/load-geography.mjs`, lancé par `npm run geo:load` (Scalingo) ou `bun scripts/load-geography.ts` (local), avec `DATABASE_URL`. Tout est téléchargé et vérifié avant d'ouvrir la base. Les trois tables sont remplacées dans une seule transaction : relancer donne le même état, et une commune disparue d'une année sur l'autre disparaît aussi. `--movements-url` permet de passer au millésime suivant du COG sans changer le code.

## Vérification

- Statique : `check`, `lint`, `test`, `build`, et `db:generate` ne produit aucun écart.
- Exécution : `db:migrate` sur une base vide, puis sur une copie de la base de recette (les cahiers existants passent `published`, sans version). `geo:load` deux fois de suite : mêmes comptes.

## Questions ouvertes

- Paris, Lyon et Marseille : geo.api renvoie la commune (75056), pas les arrondissements. Si Condorcet livre un code d'arrondissement (751xx), il faudra ajouter les arrondissements municipaux (`type=arrondissement-municipal`).
- Les fusions du 1er janvier 2019 sont déjà dans le COG 2019 et ne sont pas reprises. Si des cahiers portent un code antérieur, il faudra avancer la date de départ.
