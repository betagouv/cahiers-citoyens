# Standards de code

ESLint et `tsconfig.json` imposent déjà `function` plutôt que les fonctions fléchées nommées, `interface` plutôt que `type` pour les objets, les exports nommés (sauf fichiers Next qui exigent l'export par défaut), l'absence d'`enum`, d'`any`, de `as`, de `!` et de `@ts-ignore`, les promesses traitées, les `switch` exhaustifs et les variables et paramètres utilisés. Ce qui suit, aucun outil ne le vérifie.

## TypeScript

- `unknown` puis un rétrécissement là où le type est inconnu : `typeof`, `in`, ou une garde `valeur is T`.
- Les données externes (JSON lu sur disque, arguments de ligne de commande, variables d'environnement, réponses réseau) se parsent à la frontière, en un type du domaine. Le reste du code fait confiance à ce type. Exemple : `parseManifestLine` dans `scripts/load-notebooks.ts`.
- Une liste de valeurs fermée est un tableau `as const` dont on dérive le type (`THEME_IDS` et `ThemeId` dans `scripts/fake-data/domain.ts`).

## Next.js et interface

- Server Component par défaut : la donnée se récupère côté serveur et descend en props. `'use client'` seulement là où l'interactivité ou une API du navigateur l'exige.
- L'interface vient du DSFR via `@codegouvfr/react-dsfr`. Chercher le composant dans https://github.com/codegouvfr/react-dsfr avant d'écrire du markup.

## Nommage

Tout le nommage du code est en anglais : fichiers, dossiers, identifiants, tables et colonnes, options de ligne de commande, clés de stockage. Docs, commentaires, messages et contenu restent en français.

## Fichiers

- Dossiers en minuscules avec tirets.
- Les tests sont colocalisés : `chunk-text.ts` et `chunk-text.test.ts`.
- Le schéma de la base vit dans `src/db/schema.ts`. `drizzle-kit generate` en tire les migrations de `drizzle/`, `drizzle-kit migrate` les applique. La recherche plein texte et vectorielle passe par le constructeur de requêtes ou par `sql` typé.

## Scripts

- Les scripts de `scripts/` utilisent les modules `node:` (`node:fs/promises`, `node:path`, `node:util`) plutôt que les API `Bun.*`, pour rester exécutables par Node.
- Une fonction qu'on veut tester vit dans son propre module, sans effet de bord à l'import. Le script principal l'importe.

## Tests et couverture

- `bun run test` échoue sous 100 % de couverture (lignes, branches, fonctions, instructions) sur `src/` et `scripts/`. Seuls les tests et les déclarations `.d.ts` sont exclus (`vitest.config.mts`).
- Un test vérifie un comportement : il appelle le code comme son utilisateur et compare le résultat exact. Éviter `/* v8 ignore */` ; un cas vraiment inatteignable se justifie en commentaire.
- Un point d'entrée (page, route, script) ne fait que brancher des modules testés. La base, le stockage et le réseau sont injectés ou remplacés par `vi.mock`.
- Une page ou un composant serveur se teste en rendant son HTML avec `renderToHtml` (`src/test/render.ts`), qui attend les composants asynchrones sous Suspense. Une route se teste en appelant `GET(new Request(…), contexte)`.
- ESLint limite un fichier à 300 lignes et une fonction à 60 (hors lignes vides et commentaires). Au-delà, découper en modules.
