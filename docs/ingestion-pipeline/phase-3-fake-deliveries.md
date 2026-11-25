# Phase 3 : générateur de faux dépôts

[← Vue d'ensemble](overview.md)

## Objectif

Produire des ZIP conformes au protocole à partir des faux cahiers existants, plus une variante défectueuse pour chaque contrôle. Les tests des phases 4 à 7 et la démo du premier échange s'appuient dessus.

## Changements

- `scripts/fake-data/` produit des dépôts au format de Condorcet : à la racine du ZIP, un `<id_cahier>.json` par cahier et une image par page nommée `<id_page>.<ext>`. Le ZIP est nommé `delivery-AAAA-MM-JJ-HHMM.zip`.
- Chaque ligne écrite devient une ligne du JSON, avec son polygone dans la page. L'en-tête de la mairie est `dactylographiee` (zone `non renseigné`), les contributions et les signatures sont `manuscrite`.
- Images : surtout des JPEG nommés `.png`, comme l'échantillon reçu, mais aussi de vrais PNG et des JPEG nommés `.jpg`.
- Options : nombre de cahiers, modification de N cahiers (texte, image ou métadonnées), numérotation avec des trous (`--gaps`), reconstruction d'un dépôt existant avec d'autres dates (même contenu, octets différents), et une liste de défauts à injecter (`missing-image`, `unlisted-file`, `duplicate-page`, `decreasing-pages`, `invalid-page-id`, `notebook-id-mismatch`, `invalid-image`, `invalid-json`, `schema-violation`, `path-traversal`, `nested-folder`).
- Même graine, même sortie.

## Données

- `DeliverySpec { seed; createdAt; notebooks: NotebookSpec[] }`. `Defect` est une liste fermée déclarée `as const`.

## Vérification

- Statique : `check`, `lint`, `test`.
- Exécution : `unzip -l` sur un ZIP généré. Chaque défaut produit le ZIP attendu et, pour ceux que voit le parseur de la phase 2, exactement l'erreur attendue (testé).
