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
bun run lint
```

Pour vérifier un changement dans un vrai navigateur (serveur, captures, contrôle des graphiques) : voir `.claude/skills/verify-cahiers/SKILL.md`.

N'utiliser ni npm, ni yarn, ni pnpm en local : le seul lockfile est `bun.lock`.

`bunfig.toml` refuse toute version publiée depuis moins de 7 jours (`minimumReleaseAge`). Les exemptions temporaires sont listées dans `minimumReleaseAgeExcludes`.

## Déploiement sur Scalingo

Remote : `git@ssh.osc-secnum-fr1.scalingo.com:cahiers-citoyens.git` (`git push scalingo main`).

- `.buildpacks` fixe le buildpack Node.js officiel de Scalingo.
- `output: "standalone"` dans `next.config.ts`. Le script `build` lance `next build`, puis copie `public/` et `.next/static/` dans `.next/standalone/`.
- `Procfile` : `web: npm start`, qui lance `node .next/standalone/server.js` sur `0.0.0.0:$PORT`.

Le buildpack officiel ne connaît pas Bun. Comme il ne trouve aucun lockfile qu'il sait lire, il installe les dépendances avec `npm install`. C'est pour ça que les scripts de `package.json` n'appellent jamais `bun` directement.
