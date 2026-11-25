# Phase 4 : lecture et vérification d'un ZIP

[← Vue d'ensemble](overview.md)

## Objectif

À partir d'un ZIP, obtenir soit un `VerifiedDelivery` prêt à appliquer, soit la liste complète des erreurs. Le ZIP est lu en flux, il n'est jamais chargé en entier en mémoire.

## Changements

- Créer `src/ingestion/archive.ts` : lit le ZIP64 depuis un fichier local, avec yauzl (accès direct à chaque fichier, ZIP64 et CRC32 pris en charge). Refuse tout ce qui n'est pas à la racine (sous-dossiers, chemins en `..`), les liens symboliques et les noms interdits.
- Créer `src/ingestion/verify.ts`, qui regroupe les fichiers par cahier d'après leur nom (`X.json`, `X_<numero_page>.<ext>`) et contrôle chaque cahier. Il parse le JSON (phase 2), vérifie que chaque page a son image (`.png`, `.jpg` ou `.jpeg`), une seule, qu'aucun fichier n'est en trop et que chaque image est un JPEG ou un PNG lisible. Le type se lit dans les premiers octets, jamais dans l'extension : l'échantillon reçu contient des JPEG nommés `.png`. Il lit la largeur et la hauteur dans l'en-tête et calcule l'empreinte de chaque image pendant l'extraction.
- Tout ou rien : on collecte toutes les erreurs, et une seule suffit à refuser le dépôt.

## Données

- `VerifiedDelivery { name; notebooks: VerifiedNotebook[] }`.
- `VerifiedNotebook { notebook; fingerprint; images: { page; type: "jpeg" | "png"; sha256; bytes; width; height }[] }`.
- `VerificationResult = { ok: true; delivery } | { ok: false; errors: IngestError[] }`.

## Vérification

- Statique : `check`, `lint`, `test`.
- Exécution : chaque ZIP défectueux de la phase 3 donne exactement l'erreur attendue, et le ZIP sain passe. Mesurer le temps et la mémoire sur un ZIP de plus de 4 Go (ZIP64).
- `interrogate` avant merge : c'est le contrôle qui protège la production.
