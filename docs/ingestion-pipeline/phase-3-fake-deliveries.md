# Phase 3 : générateur de faux dépôts

[← Vue d'ensemble](overview.md)

## Objectif

Produire des ZIP conformes au protocole à partir des faux cahiers existants, plus une variante défectueuse pour chaque contrôle. Les tests des phases 4 à 7 et la démo du premier échange s'appuient dessus.

## Changements

- Faire évoluer `scripts/fake-data/` : une image PNG par page (le rendu manuscrit existe déjà, il produit aujourd'hui un PDF), un `notebook.json` par cahier, un ZIP nommé `delivery-AAAA-MM-JJ-HHMM.zip`.
- Options : nombre de cahiers, modification de N cahiers (texte ou image), reconstruction d'un dépôt existant avec d'autres dates (même contenu, octets différents), et une liste de défauts à injecter (`missing-image`, `unlisted-file`, `page-gap`, `duplicate-page`, `invalid-png`, `invalid-json`, `schema-violation`, `path-traversal`, `nested-folder`).
- Même graine, même sortie, comme aujourd'hui.

## Données

- `DeliverySpec { createdAt; notebooks: NotebookSpec[]; defects: Defect[] }`. `Defect` est une liste fermée déclarée `as const`.

## Vérification

- Statique : `check`, `lint`, `test`.
- Exécution : `unzip -l` sur un ZIP généré. Chaque défaut produit le ZIP attendu (testé).
