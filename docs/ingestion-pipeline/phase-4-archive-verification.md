# Phase 4 : lecture et vérification d'un ZIP

[← Vue d'ensemble](overview.md)

## Objectif

À partir d'un ZIP, obtenir soit un `VerifiedDelivery` prêt à appliquer, soit la liste complète des erreurs. Le ZIP est lu en flux, il n'est jamais chargé en entier en mémoire.

## Changements

- Créer `src/ingestion/archive.ts` : lit le ZIP64 depuis un fichier local, avec yauzl (accès direct à chaque fichier, ZIP64 et CRC32 pris en charge). Refuse tout ce qui sort de `notebooks/<id>/`, les sous-dossiers, les liens symboliques et les noms interdits.
- Créer `src/ingestion/verify.ts`, qui contrôle chaque dossier de cahier. Il lit `notebook.json` (phase 2), vérifie que chaque image annoncée existe, qu'aucun fichier n'est en trop et que chaque PNG est lisible (signature et en-tête : largeur et hauteur). Il calcule aussi l'empreinte de chaque image pendant l'extraction.
- Tout ou rien : on collecte toutes les erreurs, et une seule suffit à refuser le dépôt.

## Données

- `VerifiedDelivery { name; notebooks: VerifiedNotebook[] }`.
- `VerifiedNotebook { id; manifest; fingerprint; images: { page; sha256; bytes; width; height }[] }`.
- `VerificationResult = { ok: true; delivery } | { ok: false; errors: IngestError[] }`.

## Vérification

- Statique : `check`, `lint`, `test`.
- Exécution : chaque ZIP défectueux de la phase 3 donne exactement l'erreur attendue, et le ZIP sain passe. Mesurer le temps et la mémoire sur un ZIP de plus de 4 Go (ZIP64).
- `interrogate` avant merge : c'est le contrôle qui protège la production.
