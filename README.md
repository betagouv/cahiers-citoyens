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

Pour vérifier un changement dans un vrai navigateur (serveur, captures, contrôle des graphiques) : voir `.claude/skills/verify-cahiers/SKILL.md`.

N'utiliser ni npm, ni yarn, ni pnpm en local : le seul lockfile est `bun.lock`.

`bunfig.toml` refuse toute version publiée depuis moins de 7 jours (`minimumReleaseAge`). Les exemptions temporaires sont listées dans `minimumReleaseAgeExcludes`.

## Fausses données et base locale

En attendant les vrais cahiers, `scripts/fausses-donnees/generer.ts` produit des cahiers fictifs : un `scan.pdf` (pages image, écriture manuscrite) et une `transcription.txt` par cahier, plus un `manifeste.jsonl` qui donne le thème de chaque contribution, pour évaluer la recherche plus tard. Même graine, même sortie. `data/` est ignoré par git.

```bash
bun scripts/fausses-donnees/generer.ts --nombre 200 --sortie data/fausses-donnees --graine 42
```

Le schéma de la base est décrit dans `prisma/schema.prisma` et s'applique par les migrations de `prisma/migrations/` (Postgres avec l'extension `vector`). Créer une base locale, puis appliquer les migrations :

```bash
createdb cahiers
DATABASE_URL=postgres://localhost:5432/cahiers bunx prisma migrate dev
```

Le chargeur insère ou met à jour chaque cahier et remplace ses chunks. Le relancer ne crée pas de doublons. Il n'applique pas le schéma : sur une base existante, `prisma migrate deploy` le fait. Les embeddings restent vides pour l'instant.

```bash
DATABASE_URL=postgres://localhost:5432/cahiers bun scripts/charger.ts --source data/fausses-donnees
```

`bun install` lance `prisma generate`, qui écrit le client dans `src/generated/prisma` (ignoré par git). Après une modification de `prisma/schema.prisma`, `bunx prisma migrate dev --name <nom>` crée et applique la migration, puis `bunx prisma generate` régénère le client.

Les clés S3 enregistrées en base (`cahiers/<id>/scan.pdf`, `cahiers/<id>/transcription.txt`) reprennent l'arborescence locale, sous le préfixe `fausses-donnees/` d'un bucket privé compatible S3. Les clés d'accès ne doivent jamais être commitées.

Les versions récentes de l'AWS CLI ajoutent par défaut une somme de contrôle que certains stockages compatibles S3 refusent (`trailing checksum is not supported`). Les deux variables `AWS_*_CHECKSUM_*` la désactivent.

```bash
AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… \
AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
aws --region <region> --endpoint-url <endpoint> \
  s3 sync data/fausses-donnees s3://<bucket>/fausses-donnees/
```

## Déploiement sur Scalingo

Déploiement : `git push scalingo main`, avec le remote `scalingo` ajouté depuis le tableau de bord Scalingo.

- `.buildpacks` fixe le buildpack Node.js officiel de Scalingo.
- `output: "standalone"` dans `next.config.ts`. Le script `build` lance `next build`, puis copie `public/` et `.next/static/` dans `.next/standalone/`.
- `prisma generate` tourne à l'installation (`postinstall`) et au début du script `build`. Aucune base n'existe encore sur Scalingo : quand elle existera, ajouter `prisma migrate deploy` au script `build`, après `prisma generate`.
- `Procfile` : `web: npm start`, qui lance `node .next/standalone/server.js` sur `0.0.0.0:$PORT`.

Le buildpack officiel ne connaît pas Bun. Comme il ne trouve aucun lockfile qu'il sait lire, il installe les dépendances avec `npm install`. C'est pour ça que les scripts de `package.json` n'appellent jamais `bun` directement.
