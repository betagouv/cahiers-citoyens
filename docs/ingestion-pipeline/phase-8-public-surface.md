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
- Mettre à jour les fiches `verify-notebooks` concernées (`notebooks.md`, `search.md`).

## Données

Aucune nouvelle donnée : on lit `notebooks.status` et `pages`.

## Vérification

- Statique : `check`, `lint`, `test`, `build`.
- Exécution : `verify-notebooks`. Un cahier publié s'affiche page par page. Après `ingest withdraw`, la page et les images répondent 404, et le cahier n'apparaît plus ni dans la liste ni dans la recherche.
