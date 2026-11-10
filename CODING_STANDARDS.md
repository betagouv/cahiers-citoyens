# Standards de code

ESLint et `tsconfig.json` imposent déjà `function` plutôt que les fonctions fléchées nommées, `interface` plutôt que `type` pour les objets, les exports nommés (sauf fichiers Next qui exigent l'export par défaut), l'absence d'`enum`, d'`any`, de `as`, de `!` et de `@ts-ignore`, les promesses traitées, les `switch` exhaustifs et les variables et paramètres utilisés. Ce qui suit, aucun outil ne le vérifie.

## TypeScript

- `unknown` puis un rétrécissement là où le type est inconnu : `typeof`, `in`, ou une garde `valeur is T`.
- Les données externes (JSON lu sur disque, arguments de ligne de commande, variables d'environnement, réponses réseau) se parsent à la frontière, en un type du domaine. Le reste du code fait confiance à ce type. Exemple : `lireLigneManifeste` dans `scripts/charger.ts`.
- Une liste de valeurs fermée est un tableau `as const` dont on dérive le type (`THEME_IDS` et `ThemeId` dans `scripts/fausses-donnees/domaine.ts`).

## Next.js et interface

- Server Component par défaut : la donnée se récupère côté serveur et descend en props. `'use client'` seulement là où l'interactivité ou une API du navigateur l'exige.
- L'interface vient du DSFR via `@codegouvfr/react-dsfr`. Chercher le composant dans https://github.com/codegouvfr/react-dsfr avant d'écrire du markup.

## Fichiers

- Dossiers en minuscules avec tirets.
- Les tests sont colocalisés : `decouper.ts` et `decouper.test.ts`.

## Scripts

- Les scripts de `scripts/` utilisent les modules `node:` (`node:fs/promises`, `node:path`, `node:util`) plutôt que les API `Bun.*`, pour rester exécutables par Node.
- Une fonction qu'on veut tester vit dans son propre module, sans effet de bord à l'import. Le script principal l'importe.
