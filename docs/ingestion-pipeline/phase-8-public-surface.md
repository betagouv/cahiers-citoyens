# Phase 8 : côté public (pages en images, retraits, recherche)

[← Vue d'ensemble](overview.md)

## Objectif

Le site affiche chaque page en image, à côté de sa transcription. Un cahier retiré disparaît du site, de la recherche et des fichiers servis.

## Changements

- `/notebooks/[id]` remplace le lecteur PDF par la liste des pages : image et texte côte à côte (l'un sous l'autre sur mobile), avec une ancre par page (`#page-3`). Les images se chargent au fil du défilement.
- `/notebooks/[id]/pages/[page]` sert l'image depuis le bucket privé, comme `/notebooks/[id]/scan` aujourd'hui. Cette route remplace celle du scan.
- `src/proxy.ts`, la liste et la recherche ne voient que les cahiers `published`. Un cahier retiré répond 404.
- Les images d'une version sont immuables, puisque leur clé contient la version : `Cache-Control` long, avec l'URL versionnée. Un retrait les rend introuvables, car la route vérifie le statut à chaque requête.
- Les citations de la recherche renvoient à la page (`/notebooks/<id>#page-3`).
- Supprimer `scan_key`, `transcription_key` et `transcription` de `notebooks`, gardées par la phase 5 tant que le site les lisait, avec la route `/notebooks/[id]/scan`.
- Mettre à jour les fiches `verify-notebooks` concernées (`notebooks.md`, `search.md`).

## Données

On lit `notebooks.status` et `pages`. Migration qui retire les trois colonnes de l'ancien chargement.

## Vérification

- Statique : `check`, `lint`, `test`, `build`.
- Exécution : `verify-notebooks`. Un cahier publié s'affiche page par page. Après `ingest withdraw`, la page et les images répondent 404, et le cahier n'apparaît plus ni dans la liste ni dans la recherche.

## Décisions

- **Adresse versionnée.** L'image d'une page est servie par `/notebooks/<id>/pages/<n>?v=<version>`. La route exige `v` égale à la version en ligne : une ancienne adresse répond 404 au lieu de servir, sous une adresse gardée un an en cache, le contenu d'une autre version.
- **Cache réservé au navigateur.** `Cache-Control: private, max-age=31536000, immutable`. `public` laisserait un cache partagé servir l'image d'un cahier retiré ; la route ne pourrait plus le refuser. Un navigateur qui a déjà vu l'image la garde.
- **Images non optimisées.** `next/image` avec `unoptimized` : l'optimiseur de Next garde ses dérivés en cache selon le `Cache-Control` de la source, donc un an, et servirait une image retirée. Les images partent telles que livrées.
- **`opened_on` supprimée aussi.** Seul `scripts/load.ts` la remplissait, le JSON de Condorcet ne donne pas de date d'ouverture. La liste affiche la commune et le nombre de pages à la place. `CorpusFigures`, qui n'était plus affiché depuis la nouvelle page d'accueil, part avec.
- **Cahiers sans version.** La migration ne supprime pas les cahiers chargés par `load.ts`. Ils restent `published`, sans pages : la page l'annonce (« Les pages de ce cahier ne sont pas encore en ligne. »).
- **Recherche par question.** Le retrait supprime déjà les chunks d'un cahier ; la recherche joint en plus `notebooks` sur `status = 'published'`.
- **Données locales.** Les faux dépôts de la phase 3, publiés par `scripts/ingest-local.ts`, remplacent `load.ts`. `LOCAL_BUCKET_DIR` fait lire au site les images du même dossier (README, « Ingestion locale »).

## Questions ouvertes

- Les cahiers de `load.ts` encore en base de recette s'affichent sans pages. Les retirer (`ingest withdraw`) ou les supprimer (`delete from notebooks where online_version is null`) avant d'ouvrir le site.
- Les images sont servies à pleine résolution (des JPEG à 300 ppp dans l'échantillon). Des dérivés plus légers, calculés à l'ingestion, allégeraient la page.
