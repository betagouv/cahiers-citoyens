# Recherche

`/search?q=<question>` affiche une barre de recherche DSFR, puis une réponse rédigée en français avec des renvois `[1]` à `[5]`, puis les cinq passages sources sous forme de cartes qui mènent chacune à son cahier. La recherche combine plein texte et vecteurs (fusion RRF), reclasse les passages et rédige la réponse via l'API Albert (`src/lib/search/`). Les résultats arrivent en flux : la page affiche d'abord `Recherche des passages et rédaction de la réponse…`.

## Sub-features

- `search-answer` : bloc `Réponse` avec renvois cliquables vers `#source-<n>`, et la mention du modèle qui l'a rédigée.
- `search-sources` : cartes `[n] Cahier <id>` avec un extrait de 600 caractères au plus, lien vers `/notebooks/<id>`.
- `search-empty` : sans question, un texte d'explication et trois exemples cliquables.
- `search-no-results` : question hors sujet, `Aucun passage des cahiers ne répond à « … »`.
- `search-degraded` : Albert injoignable, encadré d'information, alerte `momentanément indisponible` et sources issues du plein texte seul ; la page répond 200.

## How to get to it (user POV)

- Ouvrir `/search` directement : aucun lien n'y mène encore depuis l'accueil ni l'en-tête.
- Un exemple de la page vide.

## Driving it with agent-browser

Préconditions : base chargée **et vectorisée** (`scripts/embed.ts`), `ALBERT_API_KEY` dans `.env.local`.

- **Réponse.** `notebooks-verify shot search-medecin "/search?q=Il%20n%27y%20a%20plus%20de%20m%C3%A9decin%20au%20village"` (le `wait 2500` de `shot` laisse le temps à la réponse, ≈ 2 s). Le `snapshot` contient le titre `Réponse`, au moins un lien `[1]`, le titre `Sources` et des titres `[1] Cahier notebook-…`. Lire les extraits : ils doivent parler de médecins.
- **Question vide.** `notebooks-verify shot search-empty "/search?q="` : `Par exemple :` et trois liens.
- **Hors sujet.** `/search?q=recette%20de%20la%20tarte%20aux%20pommes` : `Aucun passage des cahiers ne répond`.
- **Albert indisponible.** Lancer un serveur avec `ALBERT_BASE_URL=http://127.0.0.1:9/v1` (port fermé), par exemple le build standalone : `PORT=<port> ALBERT_BASE_URL=http://127.0.0.1:9/v1 node .next/standalone/server.js`. La question du médecin répond 200, avec `La recherche par le sens est momentanément indisponible` et des sources. Trois essais par appel : compter quelques secondes.

## Gotchas

- Sans embeddings en base, la recherche vectorielle ne renvoie rien et seule la branche plein texte compte : lancer `scripts/embed.ts` après chaque `scripts/load.ts`.
- La réponse est générée : son texte change d'un appel à l'autre. Vérifier la structure (renvois valides, sources pertinentes), pas une phrase exacte.
- `.env.local` est lu par `next dev` **et** `next build` : le standalone n'en hérite pas, il faut lui passer les variables.
