# Phase 6 : planification et application des changements

[← Vue d'ensemble](overview.md)

## Objectif

Transformer un `VerifiedDelivery` en changements, puis les appliquer de façon atomique et idempotente. Ajouter la commande de retrait.

## Modules (`src/ingestion/`)

| Module                      | Rôle                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `plan.ts`                   | Pur. `planChanges(delivery, states)` : un `Change` par cahier du dépôt, `planCounts` pour les compteurs du dépôt.                     |
| `notebook-state.ts`         | Lit l'état en base des cahiers du dépôt (statut, version en ligne, empreinte, dernière version, images), `FOR UPDATE` en transaction. |
| `storage-keys.ts`           | `notebooks/<id>/v<version>/<page>.<jpg\|png>`, extension tirée du type lu dans l'image.                                               |
| `image-storage.ts`          | Interface `ImageStorage` (`put`, `remove`) et son implémentation S3.                                                                  |
| `upload-images.ts`          | Relit les images dans le ZIP, en flux, et les copie ; recompte SHA-256 et taille au passage.                                          |
| `chunk-text.ts`             | Ancien `scripts/chunk.ts` : coupe d'une contribution trop longue, et découpage des transcriptions de `scripts/load.ts`.               |
| `chunk-pages.ts`            | Texte d'une page et chunks par page, puis par contribution.                                                                           |
| `notebook-rows.ts`          | Pur. Lignes de `notebook_versions`, `notebooks`, `pages`, `lines` et `chunks` d'une nouvelle version.                                 |
| `write-notebook-version.ts` | Écrit ces lignes dans la transaction du dépôt.                                                                                        |
| `delivery-rows.ts`          | Statut du dépôt (verrouillable) et passage à `applied` avec ses compteurs.                                                            |
| `stale-plan.ts`             | Compare l'état supposé par le plan à l'état relu sous verrou.                                                                         |
| `apply-delivery.ts`         | Enchaîne copie, transaction, suppression des anciennes images et recalcul des comptes.                                                |
| `withdraw.ts`               | `withdrawNotebook(id, reason)`.                                                                                                       |
| `remove-files.ts`           | Suppression au mieux : un échec est journalisé, rien ne s'arrête.                                                                     |

## Plan

`ChangePlan { delivery; changes: Change[] }`, `Change = Publish | Replace | Republish | Unchanged` :

| État en base                                        | Changement  | Version      | Images retirées          |
| --------------------------------------------------- | ----------- | ------------ | ------------------------ |
| Aucun                                               | `publish`   | 1            | aucune                   |
| Publié, même empreinte                              | `unchanged` | —            | —                        |
| Publié, autre empreinte ou sans version (`load.ts`) | `replace`   | dernière + 1 | celles des pages en base |
| Retiré, quelle que soit l'empreinte                 | `republish` | dernière + 1 | celles des pages en base |

Un cahier absent du dépôt n'apparaît pas dans le plan. Chaque changement garde l'état qu'il suppose (`current`), relu ensuite sous verrou. Republié compte comme publié dans `deliveries.published_count`.

## Application

1. Lecture du statut du dépôt : `applied` → seul le recalcul des comptes est refait ; tout autre statut que `applying` est refusé avant toute copie.
2. Copie des images des changements `publish`, `replace` et `republish`, une à la fois, avec `Content-Type` et `Content-Length`. Une image dont le SHA-256 ou la taille diffère de la vérification fait échouer le dépôt.
3. Une transaction : verrou sur la ligne du dépôt (`assertTransition(…, "applied")`), puis sur les lignes des cahiers, dans l'ordre des identifiants. Si l'état relu diffère du plan (statut, version en ligne, empreinte, dernière version), rien n'est écrit et le dépôt échoue ; la relance replanifie. Pour chaque cahier écrit : ligne créée si besoin, version ajoutée, `notebooks` mis à jour (publié, version en ligne, métadonnées, retrait effacé, colonnes de `load.ts` vidées), pages, lignes et chunks remplacés, par lots de 1 000. Le dépôt passe à `applied` avec ses compteurs.
4. Après le commit : suppression des images des versions remplacées, au mieux.
5. `select refresh_search_counts()`.

Les chunks sont écrits sans embedding : `embedPendingChunks` (`scripts/embed-chunks.ts`) traite tous les chunks dont `embedding` est vide, ce que la phase 7 lancera en fin de job.

### Découpage en chunks

Un chunk par contribution d'une page. Une contribution change quand le type d'écriture change (en-tête dactylographié, puis texte manuscrit), ou quand la page revient à une zone déjà vue dans la contribution : « Corps », « Signature », puis « Corps » ouvre la suivante. Les lignes sont jointes par une espace, puis coupées entre deux phrases au-delà de 400 mots. Une contribution qui continue sur la page suivante y donne un autre chunk : chaque chunk cite une seule page. `pages.text` joint les lignes par un saut de ligne.

## Idempotence et arrêts

- Les clés ne dépendent que du cahier, de la version et de la page. Un arrêt entre la copie et le commit laisse des objets que rien ne référence ; la relance calcule le même plan, donc les mêmes versions, et réécrit les mêmes clés.
- Même ZIP deux fois : le second appel ne change rien. Même contenu rezippé sous un autre nom : tous les cahiers `unchanged`, seul le dépôt est ajouté.
- Deux traitements concurrents sur le même cahier : le second échoue au verrou (état différent) ou sur la clé primaire de `notebook_versions`. Il peut toutefois avoir déjà réécrit les images de la version que le premier vient de publier : la phase 7 doit garder un seul job à la fois (verrou consultatif).

## Retrait

`withdrawNotebook({ db, storage, log }, id, reason)` : dans une transaction, statut `withdrawn`, motif et date, suppression des chunks (la recherche par question ne filtre pas le statut). Les pages restent, hors de la recherche par lieu et mot-clé (qui filtre `published`) : elles gardent les clés des images à supprimer. Puis `refresh_search_counts()`, puis suppression des images. Un second retrait garde le motif et la date du premier et refait les deux dernières étapes. Les fichiers d'un cahier de `load.ts` (`scan.pdf`) ne sont pas supprimés : la route du scan ne sert plus un cahier retiré.

## Colonnes de `scripts/load.ts`

`opened_on`, `scan_key`, `transcription_key` et `transcription` deviennent facultatives (`drizzle/0005_legacy-columns-optional.sql`, additive : le code en production continue d'y écrire). Écrire une valeur factice aurait inventé une date d'ouverture que le JSON de Condorcet ne donne pas, et un scan introuvable. Le site actuel s'en accommode : date « Non renseignée », visionneuse sans scan ni transcription, `/notebooks/<id>/scan` en 404. Il ne montre plus que les cahiers `published` : un cahier retiré répond 404. Les pages en images viennent en phase 8.

## Vérification

- Statique : `check`, `lint`, `test` (100 %), `build`, `db:generate` sans écart.
- Exécution, contre un Postgres 16 local migré (sans pgvector) et un stockage en mémoire, avec deux cahiers fictifs et un cahier de `load.ts` : publication, même dépôt rejoué, même contenu rezippé (ordre inversé, Deflate), remplacement, retrait deux fois, republication, arrêt entre copie et transaction puis relance. L'état final (tables, comptes de recherche, fichiers) est identique avec et sans l'arrêt.
- `interrogate` avant merge.

## Questions ouvertes

- Un arrêt entre le commit et la suppression laisse les images de la version remplacée dans le bucket : leurs clés ne sont plus en base. Un nettoyage par préfixe (`notebooks/<id>/v<n>/` avec `n` différent de la version en ligne) les retrouverait.
- La copie est séquentielle. À mesurer sur un vrai dépôt de plusieurs Go avant d'envoyer plusieurs images en parallèle.
- Un remplacement recalcule les embeddings de tous les chunks du cahier, même ceux dont le texte n'a pas changé.
