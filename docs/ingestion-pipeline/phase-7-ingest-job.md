# Phase 7 : le job `ingest` de bout en bout

[← Vue d'ensemble](overview.md)

## Objectif

Le cron relève `incoming/` et mène chaque dépôt jusqu'à `applied` ou `rejected`, sans intervention humaine.

## Modules (`src/ingestion/`)

| Module                | Rôle                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `job.ts`              | Point d'entrée du cron : branche `runIngestCommand` sur le stockage S3, la sortie standard et la sortie d'erreur.              |
| `ingest.ts`           | `runIngestCommand(args, contexte)` : parse la commande, ouvre les ressources, écrit une ligne JSON, renvoie le code de sortie. |
| `ingest-command.ts`   | Parse `run` (par défaut) et `withdraw <id> --reason <motif>`.                                                                  |
| `ingest-services.ts`  | Ouvre la base, le verrou, le stockage et la vectorisation à partir de l'environnement.                                         |
| `ingest-run.ts`       | `runIngest` : verrou, réception, traitement des dépôts en attente, vectorisation, `JobRun`.                                    |
| `run-lock.ts`         | Verrou consultatif Postgres (`pg_try_advisory_lock`), sur une connexion dédiée.                                                |
| `receive-incoming.ts` | Enregistre chaque ZIP de `incoming/` (`received`) et le déplace dans `deliveries/` (copie puis suppression).                   |
| `process-delivery.ts` | Télécharge un ZIP de `deliveries/` dans un dossier temporaire, le vérifie, l'applique ; `failed` sur erreur de notre côté.     |
| `delivery-rows.ts`    | Lignes de `deliveries` : création, dépôts en attente, transitions gardées par la carte de `delivery-status.ts`, tentatives.    |
| `object-store.ts`     | Interface `ObjectStore` (`list`, `copy`, `remove`, `download`) et son implémentation S3.                                       |
| `file-bucket.ts`      | `ObjectStore` et `ImageStorage` sur un dossier local, pour le développement et les essais.                                     |
| `run-error.ts`        | Erreur d'une exécution, rattachée à un dépôt, à `embed` ou à `run`.                                                            |

`scripts/ingest-local.ts` lance les mêmes commandes contre un dossier local (`LOCAL_BUCKET_DIR`, `data/bucket` par défaut). `embedPendingChunks` (`scripts/embed-chunks.ts`) renvoie maintenant le nombre de chunks vectorisés.

## Déroulé d'un `ingest run`

1. `pg_try_advisory_lock` sur une connexion à part (un verrou de session appartient à sa connexion ; le pool peut en changer). Verrou pris ailleurs : `locked: true`, code 0. Fermer la connexion libère le verrou, même après un arrêt brutal.
2. Pour chaque `incoming/*.zip` à la racine, par ordre de nom : ligne `deliveries` créée ou relue, puis copie vers `deliveries/` et suppression de `incoming/`. Un arrêt entre les deux laisse le ZIP aux deux endroits ; la reprise recopie les mêmes octets. Le nom est contrôlé à la vérification, qui refuse le dépôt s'il ne suit pas le protocole.
3. Pour chaque dépôt en attente, par ordre de nom (`received`, `verifying`, `applying`, et `failed` avec moins de 3 tentatives) : tentative comptée, `received` ou `failed` → `verifying`, téléchargement en flux dans un dossier temporaire supprimé ensuite, `verifyDelivery`, puis `rejected` (erreurs en base) ou `applying` → `applyDelivery` → `applied`. Un dépôt trouvé en `verifying` ou `applying` (job interrompu) est revérifié sans changer de statut, puis repris là où il en était.
4. Toute erreur de notre côté passe le dépôt à `failed`, avec le message dans `deliveries.failure`. S'il a déjà atteint `applied` (le recalcul des comptes a échoué après le commit), il le garde.
5. `embedPendingChunks` avec Albert. Une panne d'Albert ou une clé absente est une erreur du run ; les dépôts restent `applied` et le job suivant reprend les chunks.

## Données

- Migration additive `drizzle/0006_delivery-attempts.sql` : `deliveries.attempts` (tentatives commencées, relances et reprises comprises) et `deliveries.failure` (dernier message d'échec, gardé après une relance réussie).
- `JobRun { event: "ingest.run"; startedAt; finishedAt; locked; deliveries: { name; from; to }[]; embedded; errors: { scope; message }[] }`, seule ligne de la sortie standard. Les messages de suivi (progression de la vectorisation, suppressions d'images impossibles) vont sur la sortie d'erreur. Code de sortie 1 si `errors` n'est pas vide. `ingest withdraw` écrit `{ event: "ingest.withdraw"; id; reason; result | error }`.

## Décisions

- **Renvoi d'un nom déjà traité.** Un ZIP de `incoming/` dont le dépôt est `applied` ou `rejected` est supprimé sans traitement, avec une erreur dans le `JobRun` : le protocole veut un nouvel horodatage par dépôt.
- **Dépôt interrompu en boucle.** La tentative est comptée avant le traitement : un dépôt qui fait tomber le conteneur à chaque essai passe à `failed` au-delà de 3 tentatives, au lieu de bloquer chaque job.
- **Un seul préfixe.** `incoming/`, `deliveries/` et `notebooks/` sont sous `S3_PREFIX`, comme les clés des scans. En recette, Condorcet dépose donc sous ce préfixe.
- **Build.** esbuild regroupait yauzl et le SDK S3 en ESM, mais leurs `require("fs")` échouaient au chargement (« Dynamic require of "fs" is not supported »). `scripts/build-jobs.mjs` ajoute une bannière `createRequire` ; tout reste dans `dist/jobs/ingest.mjs`, aucune dépendance ne change de section. `build-jobs.test.ts` lance le job compilé depuis un dossier vide.
- **`scripts/load.ts` reste.** Les faux cahiers de `load.ts` sont les seuls à montrer un scan et une transcription : un cahier venu d'un dépôt n'a ni l'un ni l'autre tant que la phase 8 n'affiche pas les pages en images. Supprimer `load.ts` maintenant rendrait la visionneuse vide sur toute base rechargée (local, recette). À supprimer en phase 8. Les faux cahiers peuvent déjà passer par le job : `deliver.ts --out data/bucket/incoming` puis `ingest-local.ts run`.

## Vérification

- Statique : `check`, `lint`, `test` (100 %), `build`, `db:generate` sans écart, `npm install --dry-run` sans `~/.npmrc`.
- Exécution, contre un Postgres 16 local migré (embeddings en `text`, sans pgvector), un bucket en dossier et une vectorisation factice, avec des dépôts de 2 cahiers : publication ; même ZIP renvoyé (supprimé, rien ne change) ; même contenu rezippé (2 inchangés) ; contenu modifié (1 remplacé, images de v1 supprimées) ; dépôt défectueux (`rejected`, erreurs en base) ; retrait deux fois puis republication (v3) ; arrêt du processus pendant la copie des images, puis relance (`applying` → `applied`, mêmes versions) ; deux exécutions simultanées (la seconde sort sur le verrou). `dist/jobs/ingest.mjs` tourne sous Node 22 depuis un dossier vide contre cette base.

## Reste pour la recette et la phase 9

- Le même scénario contre le vrai bucket : droits de la clé du job (lecture, écriture, suppression, copie), `CopyObject` sur le stockage du fournisseur.
- `CopyObject` est limité à 5 Go par objet. Un dépôt plus gros (le protocole prévoit ZIP64 au-delà de 4 Go) demande une copie multipart (`UploadPartCopy`).
- Le disque du conteneur cron doit contenir le plus gros ZIP. À mesurer avant le premier vrai dépôt.
- Phase 9 : rapport `reports/<nom>.json` à chaque transition finale, alerte sur `failed` à 3 tentatives (`attempts`, `failure`), sur une entrée `errors` du `JobRun`, et sur un ZIP qui reste dans `incoming/`.
