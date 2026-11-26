# Phase 4 : lecture et vérification d'un ZIP

[← Vue d'ensemble](overview.md)

## Objectif

À partir d'un ZIP, obtenir soit un `VerifiedDelivery` prêt à appliquer, soit la liste complète des erreurs. Le ZIP est lu en flux, il n'est jamais chargé en entier en mémoire.

## Changements

Point d'entrée : `verifyDelivery(zipPath)` dans `src/ingestion/verify-delivery.ts`. Il compose de petits modules :

- `archive.ts` : lit le ZIP (ZIP64 compris) depuis un fichier local avec yauzl, un fichier à la fois. yauzl ne contrôle pas le CRC32 : chaque flux le recalcule et échoue en fin de lecture s'il ne correspond pas.
- `entry-name.ts` : tout est à la racine. Refuse `..`, la barre oblique inverse, les chemins absolus, les caractères de contrôle, les dossiers et sous-dossiers, les liens symboliques (mode Unix des attributs externes).
- `entry-kind.ts` : rattache chaque fichier à son cahier par son nom, `X.json` ou `X_<numero_page>.<png|jpg|jpeg>` (extension sans casse). Le numéro de page est le dernier `_<n>`. Tout autre fichier est en trop.
- `json-text.ts` : lit un JSON en entier, 20 Mo au plus, en UTF-8.
- `image-digest.ts`, `image-header.ts`, `png-header.ts`, `jpeg-header.ts` : hachent chaque image (SHA-256) pendant l'extraction et n'en gardent que le premier Mo, le temps d'y lire le type et les dimensions (IHDR du PNG, premier SOFn du JPEG, baseline ou progressif, après les segments APPn). Le type vient des premiers octets, jamais de l'extension : l'échantillon reçu contient des JPEG nommés `.png`.
- `archive-contents.ts` : un seul parcours du ZIP. Contrôle les noms et les doublons, lit les JSON, hache les images, range le tout par cahier.
- `page-images.ts`, `polygon-bounds.ts`, `verify-notebook.ts` : contrôlent chaque cahier et calculent son empreinte (`fingerprint.ts`).
- `delivery-name.ts` : le nom du dépôt est `delivery-AAAA-MM-JJ-HHMM.zip`, à une minute UTC qui existe.

Tout ou rien : on collecte toutes les erreurs de tous les cahiers, et une seule suffit à refuser le dépôt.

## Contrôles ajoutés au protocole

- Chaque image a la largeur et la hauteur que le JSON annonce pour sa page (`image-size-mismatch`). L'échantillon reçu (2484 × 3507) les respecte, le générateur de faux dépôts aussi.
- Chaque point de chaque polygone tient dans `[0, largeur] × [0, hauteur]` (`polygon-out-of-page`).

Quand le JSON d'un cahier est refusé, on ne sait pas quelles pages existent : seuls les contrôles propres aux images (lisibles, une par page) s'ajoutent à ses erreurs. Une page en double ne produit donc ni image manquante ni fichier en trop.

## Données

- `VerifiedDelivery { name; notebooks: VerifiedNotebook[] }`.
- `VerifiedNotebook { notebook; fingerprint; images: { page; entryName; type: "jpeg" | "png"; sha256; bytes; width; height }[] }`. `entryName` permet à la phase 6 de relire l'image dans le ZIP pour la copier.
- `VerificationResult = { ok: true; delivery } | { ok: false; errors: IngestError[] }`.
- `IngestError` : `page` est le numéro de page, `position` le rang de la page dans la liste `pages` du JSON. Une erreur du JSON donne `position`, et `page` quand le numéro est valide.

Codes ajoutés : `invalid-delivery-name`, `unreadable-archive`, `empty-delivery`, `invalid-entry-name`, `nested-entry`, `symlink-entry`, `duplicate-entry`, `unsupported-entry`, `corrupt-entry`, `json-too-large`, `unlisted-file`, `missing-image`, `duplicate-image`, `invalid-image`, `image-size-mismatch`, `polygon-out-of-page`.

## Vérification

- Statique : `check`, `lint`, `test`.
- Exécution : chaque ZIP défectueux de la phase 3 donne exactement l'erreur attendue, et le ZIP sain passe (`verify-delivery*.test.ts`). `scripts/measure-verify.ts` mesure le temps et la mémoire : `--zip <chemin>`, ou `--count <n> --out <dossier>` pour générer d'abord un faux dépôt.
- `interrogate` avant merge : c'est le contrôle qui protège la production.
