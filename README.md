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

Pour vérifier un changement dans un vrai navigateur (serveur, captures, contrôle des graphiques) : voir `.claude/skills/verify-notebooks/SKILL.md`.

N'utiliser ni npm, ni yarn, ni pnpm en local : le seul lockfile est `bun.lock`.

`bunfig.toml` refuse toute version publiée depuis moins de 7 jours (`minimumReleaseAge`). Les exemptions temporaires sont listées dans `minimumReleaseAgeExcludes`.

## Fausses données et base locale

En attendant les vrais cahiers, `scripts/fake-data/generate.ts` produit des cahiers fictifs : un `scan.pdf` (pages image, écriture manuscrite) et une `transcription.txt` par cahier, plus un `manifest.jsonl` qui donne le thème de chaque contribution, pour évaluer la recherche plus tard. Même graine, même sortie. `data/` est ignoré par git.

```bash
bun scripts/fake-data/generate.ts --count 200 --out data/fake-data --seed 42
```

Le schéma de la base est décrit dans `src/db/schema.ts` (Drizzle) et s'applique par les migrations de `drizzle/` (Postgres avec l'extension `vector`). Créer une base locale, puis appliquer les migrations :

```bash
createdb cahiers
DATABASE_URL=postgres://localhost:5432/cahiers bun run db:migrate
```

Le chargeur insère ou met à jour chaque cahier et remplace ses chunks. Le relancer ne crée pas de doublons. Il n'applique pas le schéma : `bun run db:migrate` le fait. Les embeddings restent vides pour l'instant.

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

## Déploiement sur Scalingo

Déploiement : `git push scalingo main`, avec le remote `scalingo` ajouté depuis le tableau de bord Scalingo.

- `.buildpacks` fixe le buildpack Node.js officiel de Scalingo.
- `output: "standalone"` dans `next.config.ts`. Le script `build` lance `next build`, puis copie `public/` et `.next/static/` dans `.next/standalone/`.
- `Procfile` : `postdeploy: npm run db:migrate` applique les migrations Drizzle à chaque déploiement, une fois le build fait et avant la bascule du trafic. Si elles échouent, le déploiement est refusé et l'ancienne version reste en ligne. `drizzle-kit` est donc dans `dependencies`, car Scalingo retire les `devDependencies` après le build. L'addon PostgreSQL fournit `DATABASE_URL` : il doit exister avant le premier déploiement qui contient ce hook.
- `Procfile` : `web: npm start`, qui lance `node .next/standalone/server.js` sur `0.0.0.0:$PORT`.

Le buildpack officiel ne connaît pas Bun. Comme il ne trouve aucun lockfile qu'il sait lire, il installe les dépendances avec `npm install`. C'est pour ça que les scripts de `package.json` n'appellent jamais `bun` directement.
