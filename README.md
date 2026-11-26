# Cahiers citoyens

Application Next.js (App Router, TypeScript, Tailwind).

## Prérequis

- Node.js 22
- [Bun](https://bun.sh) : gère les paquets et lance les scripts de `package.json`

## Développement

```bash
bun install
bun dev              # http://localhost:3000
bun run build        # build de production (standalone)
bun run start        # lance le build standalone
bun run check        # typage (tsc --noEmit)
bun run lint
bun run test         # vitest
bun run format       # prettier sur tout le dépôt
```

Le hook pre-commit (Husky) lance le typage, `lint-staged` (Prettier puis ESLint sur les fichiers indexés) et les tests. La CI GitHub (`.github/workflows/ci.yml`) lance `check`, `lint`, `test` et `build` sur chaque pull request et sur `main`. Conventions de code : `CODING_STANDARDS.md`.

Pour vérifier un changement dans un vrai navigateur (serveur, captures, statuts HTTP) : voir `.claude/skills/verify-notebooks/SKILL.md`.

N'utiliser ni npm, ni yarn, ni pnpm en local : le seul lockfile est `bun.lock`.

`bunfig.toml` refuse toute version publiée depuis moins de 7 jours (`minimumReleaseAge`). Les exemptions temporaires sont listées dans `minimumReleaseAgeExcludes`.

## Fausses données et base locale

En attendant les vrais cahiers, `scripts/fake-data/generate.ts` produit des cahiers fictifs : un `scan.pdf` (pages image, écriture manuscrite) et une `transcription.txt` par cahier, plus un `manifest.jsonl` qui donne le thème de chaque contribution, pour évaluer la recherche plus tard. Même graine, même sortie. `data/` est ignoré par git.

```bash
bun scripts/fake-data/generate.ts --count 200 --out data/fake-data --seed 42
```

### Faux dépôts Condorcet

`scripts/fake-data/deliver.ts` produit, à partir des mêmes faux cahiers, un dépôt au format du [protocole](docs/ingestion-protocol.md) : `delivery-AAAA-MM-JJ-HHMM.zip`, avec à la racine, pour chaque cahier, `<id_cahier>.json` et une image par page nommée `<id_cahier>_<numero_page>.png`. L'identifiant imite ceux de Condorcet (`CC_76600_190101_76351_MD_10012` : code postal fictif, date d'ouverture, code INSEE, numéro). Chaque ligne dessinée devient une ligne du JSON, avec son polygone ; quelques pages blanches n'ont aucune ligne. Comme dans l'échantillon reçu, la plupart des images sont des JPEG nommés `.png` ; quelques cahiers ont de vrais PNG ou des `.jpg`. Les images sont stockées telles quelles, le JSON est compressé (Deflate).

```bash
# 10 cahiers, date du dépôt par défaut : 2026-11-24T09:30:00Z
bun scripts/fake-data/deliver.ts --count 10 --seed 42 --out data/deliveries

# Mêmes cahiers, dont 2 modifiés (texte, image ou commune) : remplacements attendus
bun scripts/fake-data/deliver.ts --count 10 --modify 2 --created-at 2026-11-25T09:30:00Z

# Numéros de page avec des trous (1, 3, 4, 7…), admis par le protocole
bun scripts/fake-data/deliver.ts --count 10 --gaps

# Un dépôt défectueux : chaque défaut touche un seul cahier, toujours le même pour une graine
bun scripts/fake-data/deliver.ts --count 10 --defect duplicate-page --defect invalid-image
```

Même graine, mêmes options : mêmes octets, y compris la date des fichiers dans le ZIP, tirée de `--created-at`. Relancer avec une autre `--created-at` reconstruit le même dépôt : chaque JSON et chaque image est identique octet pour octet, seuls le nom du ZIP et ses dates changent. C'est le cas « même contenu rezippé » du premier échange.

`--defect` se répète. Défauts possibles, un par contrôle de la section 4 du protocole :

| Défaut                 | Effet sur le cahier visé                                          |
| ---------------------- | ----------------------------------------------------------------- |
| `missing-image`        | L'image de la dernière page manque                                |
| `unlisted-file`        | L'image d'une page que le JSON n'annonce pas                      |
| `duplicate-page`       | La dernière page revient sous le même numéro                      |
| `decreasing-pages`     | Une page n+1 est insérée avant la dernière page n, avec son image |
| `invalid-page-id`      | La première page a un `id_page` mal formé (`<id>_01`)             |
| `notebook-id-mismatch` | `id_cahier` ne reprend pas le nom du fichier JSON                 |
| `invalid-image`        | La première image n'est ni un JPEG ni un PNG                      |
| `invalid-json`         | Le JSON est tronqué                                               |
| `schema-violation`     | JSON valide, mais la première page n'a pas de `largeur`           |
| `path-traversal`       | Une entrée `../../escape.txt` qui sort de l'archive               |
| `nested-folder`        | Une copie de la première image dans un sous-dossier `scans/`      |

Avec moins de cahiers que de défauts, un cahier en cumule plusieurs. Le script affiche les cahiers modifiés et les défauts injectés.

### Ingestion locale

`scripts/ingest-local.ts` lance le job `ingest` contre un dossier qui tient lieu de bucket (`LOCAL_BUCKET_DIR`, `data/bucket` par défaut) : la clé `incoming/x.zip` est le fichier `data/bucket/incoming/x.zip`. Pour publier des faux cahiers par le même chemin que les vrais, on écrit le dépôt directement dans `incoming/` (`deliver.ts` écrit d'abord un `.partial`, ignoré par le job), puis on lance le job :

```bash
bun scripts/fake-data/deliver.ts --count 10 --out data/bucket/incoming
DATABASE_URL=postgres://localhost:5432/cahiers bun scripts/ingest-local.ts run
DATABASE_URL=postgres://localhost:5432/cahiers bun scripts/ingest-local.ts withdraw <id_cahier> --reason other
```

Sans `ALBERT_API_KEY`, les chunks restent sans embedding et le rapport le signale ; `scripts/embed.ts` les traite ensuite.

Le schéma de la base est décrit dans `src/db/schema.ts` (Drizzle) et s'applique par les migrations de `drizzle/` (Postgres avec l'extension `vector`). Créer une base locale, puis appliquer les migrations :

```bash
createdb cahiers
DATABASE_URL=postgres://localhost:5432/cahiers bun run db:migrate
```

Le chargeur découpe chaque transcription en chunks (`scripts/chunk.ts`) : un par contribution, c'est-à-dire par paragraphe séparé d'une ligne vide, en-tête exclu. Une contribution de plus de 400 mots est coupée entre deux phrases. Le chargeur insère ou met à jour chaque cahier et remplace ses chunks. Le relancer ne crée pas de doublons. Il n'applique pas le schéma : `bun run db:migrate` le fait. Il laisse les embeddings vides : voir « Embeddings ».

```bash
DATABASE_URL=postgres://localhost:5432/cahiers bun scripts/load.ts --source data/fake-data
```

Après une modification de `src/db/schema.ts`, `bun run db:generate` écrit la migration correspondante dans `drizzle/`, puis `bun run db:migrate` l'applique. `drizzle-kit` ne crée pas les extensions Postgres : la migration personnalisée `drizzle/0000_enable-vector.sql` (créée par `bunx drizzle-kit generate --custom`) active `vector` avant toute table.

Les clés S3 enregistrées en base (`notebooks/<id>/scan.pdf`, `notebooks/<id>/transcription.txt`) reprennent l'arborescence locale, sous le préfixe `fake-data/` d'un bucket privé compatible S3. Les clés d'accès ne doivent jamais être commitées.

Les versions récentes de l'AWS CLI ajoutent par défaut une somme de contrôle que certains stockages compatibles S3 refusent (`trailing checksum is not supported`). Les deux variables `AWS_*_CHECKSUM_*` la désactivent.

```bash
AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… \
AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
aws --region <region> --endpoint-url <endpoint> \
  s3 sync data/fake-data s3://<bucket>/fake-data/
```

### Référentiel géographique

`departments`, `municipalities` et `municipality_code_history` décrivent toutes les communes de France et rattachent un code INSEE de 2019 (celui des cahiers) à la commune actuelle. Sources : geo.api.gouv.fr et le Code officiel géographique de l'Insee (détail dans [la phase 5](docs/ingestion-pipeline/phase-5-database-schema.md)). Le chargement remplace les trois tables dans une transaction ; le relancer donne le même état.

```bash
DATABASE_URL=postgres://localhost:5432/cahiers bun scripts/load-geography.ts [--movements-url <csv du COG>]
```

Sur Scalingo, après le build : `npm run geo:load` (lance `dist/jobs/load-geography.mjs`).

## Consulter les cahiers

L'accueil (`/`) présente le projet, propose la barre de recherche et affiche les chiffres du corpus lus en base à chaque requête : nombre de cahiers et de contributions (chunks), période d'ouverture des cahiers, part des contributions vectorisées pour la recherche.

`/notebooks` liste les cahiers chargés en base, 20 par page. `/notebooks/<id>` affiche le scan PDF à côté de la transcription (l'un sous l'autre sur mobile). Un id inconnu répond 404 : `src/proxy.ts` vérifie que le cahier existe avant le rendu. La vérification ne peut pas rester dans la page : avec Cache Components, le serveur envoie l'enveloppe statique précalculée (gabarit, en-tête) dès la requête, donc le statut 200 part avant que la page ne lise la base.

Le scan est servi par `/notebooks/<id>/scan`, qui lit l'objet dans le bucket privé et le relaie en flux, requêtes `Range` comprises. Une redirection vers une URL présignée ne marche pas : le stockage répond `X-Frame-Options: SAMEORIGIN`, et le navigateur refuse alors d'afficher le PDF dans la page. Le proxy a aussi l'avantage de ne jamais exposer d'URL du bucket.

Variables, à mettre dans `.env.local` en local (ignoré par git, voir `.env.example`) :

- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET` : le stockage compatible S3.
- `S3_PREFIX` : le dossier du bucket où se trouvent les clés enregistrées en base (`fake-data/` pour les faux cahiers).
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` : une clé en lecture seule suffit.

Le client S3 (`src/lib/scan-storage.ts`) n'envoie de somme de contrôle que si l'opération l'exige (`requestChecksumCalculation` et `responseChecksumValidation` à `WHEN_REQUIRED`), pour la même raison que l'AWS CLI ci-dessus. Sans ces variables, les pages s'affichent mais le scan répond 503.

## Embeddings

Les chunks sont vectorisés par le modèle `bge-m3` de l'API Albert (`https://albert.api.etalab.gouv.fr/v1`, compatible OpenAI) : 1024 dimensions, la taille de la colonne `chunks.embedding`. Le client vit dans `src/lib/albert.ts`. La clé se passe par la variable `ALBERT_API_KEY` (voir `.env.example`), jamais en dur. `ALBERT_BASE_URL` permet de viser une autre instance.

```bash
DATABASE_URL=… ALBERT_API_KEY=… bun scripts/embed.ts [--batch 32] [--limit N]
DATABASE_URL=… ALBERT_API_KEY=… bun scripts/search.ts "Il n'y a plus de médecin au village" [--limit 5]
```

`embed.ts` ne traite que les chunks dont `embedding` est vide, par lots, et affiche la progression. Le relancer ne refait rien. Après un rechargement par `load.ts`, qui remplace les chunks, il ne vectorise que les nouveaux. Le job `ingest` lance la même vectorisation après chaque passage. Albert refuse plus de 64 textes par requête : le client découpe au-delà. Il retente trois fois au plus sur 429 et 5xx.

`search.ts` est un outil de test manuel : il vectorise la question et affiche les chunks les plus proches en distance cosinus (distance, cahier, début du texte).

## Recherche

La recherche par lieu et mot-clé de l'accueil (`/search?place=…&q=…`, suggestions et nombres de pages) est décrite dans [docs/search-by-place-and-keyword.md](docs/search-by-place-and-keyword.md).

`/search?q=…` répond à une question à partir des cahiers (`src/lib/search/`) :

1. la question est vectorisée par `bge-m3` ;
2. deux recherches tournent en SQL, chacune limitée à 30 passages : plein texte en OU sur les mots de la question (`chunks.search`, classée par `ts_rank`) et vectorielle (distance cosinus sur `chunks.embedding`). Leurs classements sont fusionnés par Reciprocal Rank Fusion (k = 60) ;
3. `bge-reranker-v2-m3` reclasse les 30 candidats et garde les 5 meilleurs. Un passage noté sous 0,01 est écarté : une question hors sujet n'affiche alors aucune source ;
4. le modèle de chat rédige une réponse en français, fondée sur ces seuls passages, avec des renvois [1] à [5] vers les sources affichées dessous.

Chaque étape qui appelle Albert peut échouer sans faire tomber la page. Sans embedding, seule la recherche plein texte tourne ; sans reclassement, l'ordre de la fusion est gardé ; sans génération, la page affiche les sources seules. Un encadré signale chaque repli.

Variables : `ALBERT_API_KEY` (sans elle, la recherche se limite au plein texte), `ALBERT_BASE_URL` (facultative), `ALBERT_CHAT_MODEL` (facultative, `mistral-small-3-2-24b-instruct-2506` par défaut).

## Déploiement sur Scalingo

Déploiement : `git push scalingo main`, avec le remote `scalingo` ajouté depuis le tableau de bord Scalingo.

- `.buildpacks` fixe le buildpack Node.js officiel de Scalingo.
- `output: "standalone"` dans `next.config.ts`. Le script `build` lance `next build`, puis copie `public/` et `.next/static/` dans `.next/standalone/`.
- `Procfile` : `postdeploy: npm run db:migrate` applique les migrations Drizzle à chaque déploiement, une fois le build fait et avant la bascule du trafic. Si elles échouent, le déploiement est refusé et l'ancienne version reste en ligne. `drizzle-kit` est donc dans `dependencies`, car Scalingo retire les `devDependencies` après le build. L'addon PostgreSQL fournit `DATABASE_URL` : il doit exister avant le premier déploiement qui contient ce hook.
- `Procfile` : `web: npm start`, qui lance `node .next/standalone/server.js` sur `0.0.0.0:$PORT`.

### Tâches planifiées

Il n'y a pas de Bun sur Scalingo. Les jobs sont donc écrits en TypeScript sous `src/`, puis compilés au build en un seul fichier JavaScript lancé par Node. La fin du script `build` lance `scripts/build-jobs.mjs`, qui appelle esbuild : `src/ingestion/job.ts` et toutes ses dépendances (`src/db`, `drizzle-orm`, `postgres`) sont regroupés dans `dist/jobs/ingest.mjs`. De même, `scripts/load-geography.ts` devient `dist/jobs/load-geography.mjs`. Le fichier se suffit à lui-même : il tourne sans `node_modules`, donc après le retrait des `devDependencies`. `scripts/build-jobs.test.ts` le vérifie en lançant le job compilé depuis un dossier temporaire. `dist/` est ignoré par git.

`cron.json` déclare les tâches au planificateur de Scalingo, qui les lance chacune dans un conteneur à part, avec la même image que l'app. Les heures sont en UTC et l'intervalle minimal est de 10 minutes. Le job `ingest` tourne toutes les 10 minutes : il traite les dépôts de Condorcet (détail dans [la phase 7](docs/ingestion-pipeline/phase-7-ingest-job.md)).

- `ingest` ou `ingest run` (le cron) : prend un verrou consultatif Postgres (si une autre exécution le tient, il s'arrête), déplace chaque ZIP de `incoming/` vers `deliveries/`, le vérifie puis le publie ou le refuse, relance les dépôts `failed` (3 tentatives au plus) et ceux qu'un job interrompu a laissés en cours, puis vectorise les nouveaux chunks avec Albert.
- `ingest withdraw <id_cahier> --reason <not_publishable|sensitive_content|source_correction|other>` : retire un cahier du site et de la recherche, puis supprime ses images.

Variables : `DATABASE_URL`, les `S3_*` (avec une clé qui peut lire, écrire et supprimer ; `incoming/`, `deliveries/` et `notebooks/` sont sous `S3_PREFIX`) et `ALBERT_API_KEY`. Le job écrit une seule ligne JSON sur la sortie standard, par exemple `{"event":"ingest.run","startedAt":…,"finishedAt":…,"locked":false,"deliveries":[{"name":"delivery-2026-11-24-0930.zip","from":"received","to":"applied"}],"embedded":24,"errors":[]}`, et ses messages de suivi en texte sur la sortie d'erreur. Le code de sortie vaut 1 si `errors` n'est pas vide.

En local, après `bun run build` :

```bash
DATABASE_URL=… S3_ENDPOINT=… … node dist/jobs/ingest.mjs
```

Sur Scalingo, un retrait se lance en one-off : `scalingo run node dist/jobs/ingest.mjs withdraw <id_cahier> --reason sensitive_content`.

### Installation par npm

Le buildpack officiel ne connaît pas Bun. Comme il ne trouve aucun lockfile qu'il sait lire, il installe les dépendances avec `npm install`. C'est pour ça que les scripts de `package.json` n'appellent jamais `bun` directement.
