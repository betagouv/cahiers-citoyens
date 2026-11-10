<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Gestionnaire de paquets

Utiliser Bun pour tout : `bun install`, `bun add`, `bun run <script>`, `bunx`. Jamais npm, npx, yarn ni pnpm. Ne pas créer de `package-lock.json`.

Les scripts de `package.json` tournent aussi sous npm sur Scalingo : ne pas y appeler `bun`.

## Dépôt public

Tout ce qui est poussé est publié et lisible pour des années : code, commits, titres et descriptions de PR, commentaires, `.claude/`, documentation.

- Aucun secret. Décrire le contrôle effectué, pas la machine : aucun nom d'hôte, de base, de bucket, d'URL interne ni d'identifiant de projet d'hébergement.
- N'utiliser que des données fictives (fixtures, exemples, captures) : aucune donnée réelle de personne. Les preuves de vérification restent dans `.claude/skills/verify-cahiers/evidence/`, ignoré par git.
- Dans le doute sur un commit ou une PR, retirer le détail.

## Selon la tâche

- **Écrire ou relire du code** : `CODING_STANDARDS.md`.
- **Déclarer une tâche finie** : `bun run check`, `bun run lint`, `bun run test` et `bun run build` verts, puis le parcours exercé dans l'app avec le skill `verify-cahiers` (`.claude/skills/verify-cahiers/SKILL.md`).
- **Modifier un parcours ou une page** : mettre à jour sa fiche sous `.claude/skills/verify-cahiers/features/` dans le même commit.
- **Ajouter une dépendance** : vérifier qu'elle passe aussi avec npm (Scalingo installe avec npm), voir les gotchas de `verify-cahiers`.
- **Rendre la main** : `cahiers-verify cleanup` arrête ce qu'il a lancé. Tout autre serveur ou session navigateur ouverts par toi s'arrête par PID ou par port, jamais par nom de processus.

## Outillage agent

`.claude/settings.json` active le plugin pstack (`pstack@pstack-claude`) pour ce dépôt. `/maintain-verification-skill` tient la carte de vérification à jour.
