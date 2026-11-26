# Recherche

`/search` sert deux recherches. Avec `place` dans l'URL, même vide (formulaire de l'accueil, étiquettes et carte des départements), c'est la recherche par lieu et mot-clé : le formulaire prérempli, puis la liste des pages publiées (`src/app/search/_components/page-search-section.tsx`, `src/lib/page-search/`). Sinon, `/search?q=<question>` affiche une barre de recherche DSFR, puis une réponse rédigée en français avec des renvois `[1]` à `[5]`, puis les cinq passages sources sous forme de cartes qui mènent chacune à son cahier. La recherche combine plein texte et vecteurs (fusion RRF), reclasse les passages et rédige la réponse via l'API Albert (`src/lib/search/`). Les résultats arrivent en flux : la page affiche d'abord `Recherche des passages et rédaction de la réponse…`.

## Sub-features

- `search-pages` : `/search?place=71106&q=retraite` — titre d'onglet `« retraite » à Charolles (71) | Cahiers citoyens`, formulaire prérempli (`Charolles (71)`, `retraite`), titre `7 pages à Charolles (71) contiennent « retraite »` (niveau 2), puis une liste de liens `Charolles (71), page 12` vers `/notebooks/<id>#page-12`, `Cahier <id>`, extrait avec le mot en `<mark>` gras. 20 par page, pagination DSFR (`Page 2 sur 3`, liens qui gardent `place` et `q`).
- `search-pages-place` : `/search?place=25` (ou `971,972,973,974,976`) — toutes les pages du lieu, extrait = début de page, indexable (pas de `noindex`). Avec un mot-clé, `<meta name="robots" content="noindex, follow">`.
- `search-pages-nojs` : `/search?place=Charolles&q=retraite` — le texte libre est interprété par la première suggestion de lieu ; un texte sans correspondance affiche `Aucun lieu ne correspond à « … »`.
- `search-pages-empty` : `Aucune page publiée à Charolles (71) pour l’instant` ou `… ne contient « … »`, avec un lien vers `/publication`. Un mot-clé sans page, souvent un début de mot (`/search?place=71106&q=retr`), affiche ce qu'annonçait le bouton : un titre `« retr » n’est pas un mot des cahiers de Charolles (71)` (niveau 2), la liste `Mots des cahiers publiés qui commencent par « retr » :` (liens `retraite (7 pages)` vers `?q=retraite`), puis `Les 21 pages de Charolles (71)` (niveau 2), les pages du lieu sans surlignage, paginées. Sans lieu : l'avis et les mots seulement. Sans page du lieu ni mot proposé : l'état vide ; au-delà de la dernière page, `Cette page de résultats n’existe pas.`

- `search-answer` : bloc `Réponse` avec renvois cliquables vers `#source-<n>`, et la mention du modèle qui l'a rédigée.
- `search-sources` : cartes `[n] Cahier <id>, page <p>` avec un extrait de 600 caractères au plus, lien vers `/notebooks/<id>#page-<p>` (vers `/notebooks/<id>` pour un passage sans page). Seuls les passages de cahiers publiés sortent : la requête joint `notebooks` sur `status = 'published'`.
- `search-empty` : sans question, un texte d'explication et trois exemples cliquables.
- `search-no-results` : question hors sujet, `Aucun passage des cahiers ne répond à « … »`.
- `search-degraded` : Albert injoignable, encadré d'information, alerte `momentanément indisponible` et sources issues du plein texte seul ; la page répond 200.

## How to get to it (user POV)

- Formulaire `Lieu` / `Mot-clé` de l'accueil, étiquette d'un département, clic sur la carte.

- Barre de recherche de l'accueil, ou lien `Rechercher` de l'en-tête.
- Un exemple de la page vide.

## Driving it with agent-browser

Recherche par lieu et mot-clé — préconditions : base migrée, `db:seed`, pages fictives publiées, `select refresh_search_counts()`. Aucune clé Albert.

- **Liste.** `notebooks-verify shot search-pages "/search?place=71106&q=retraite"` : le `snapshot` a le `heading` de niveau 2 `<n> pages à Charolles (71) contiennent « retraite »`, puis des `heading` de niveau 3 `Charolles (71), page <n>`. Confronter `<n>` à `select count(*) from pages p join notebooks n on n.id = p.notebook_id where n.status = 'published' and n.insee_code = '71106' and p.words @@ plainto_tsquery('simple', 'retraite')`.
- **Sans JavaScript.** `curl -s "$NOTEBOOKS_BASE_URL/search?place=Charolles&q=retraite" | grep -o '<h2[^>]*>[^<]*'` : la liste est dans le HTML.
- **Lien vers la page.** Clic sur un titre `Charolles (71), page <n>` : l'URL devient `/notebooks/<id>#page-<n>` et la section `Page <n>` est en haut de l'écran.
- **Retrait.** Après `bun scripts/ingest-local.ts withdraw <id> --reason other`, aucune page du cahier ne sort de `/search?place=<code INSEE>` (après `refresh_search_counts()`, que le retrait lance) ni de la recherche par question.
- **Mobile.** `NOTEBOOKS_SHOT_WIDTH=375 notebooks-verify shot search-pages-mobile "/search?place=25&page=2"` : champs empilés, pas de défilement horizontal.

Question en langage courant :

Préconditions : base chargée **et vectorisée** (`scripts/embed.ts`), `ALBERT_API_KEY` dans `.env.local`.

- **Réponse.** `notebooks-verify shot search-medecin "/search?q=Il%20n%27y%20a%20plus%20de%20m%C3%A9decin%20au%20village"` (le `wait 2500` de `shot` laisse le temps à la réponse, ≈ 2 s). Le `snapshot` contient le titre `Réponse`, au moins un lien `[1]`, le titre `Sources` et des titres `[1] Cahier CC_…, page <p>`. Lire les extraits : ils doivent parler de médecins.
- **Question vide.** `notebooks-verify shot search-empty "/search?q="` : `Par exemple :` et trois liens.
- **Hors sujet.** `/search?q=recette%20de%20la%20tarte%20aux%20pommes` : `Aucun passage des cahiers ne répond`.
- **Albert indisponible.** Lancer un serveur avec `ALBERT_BASE_URL=http://127.0.0.1:9/v1` (port fermé), par exemple le build standalone : `PORT=<port> ALBERT_BASE_URL=http://127.0.0.1:9/v1 node .next/standalone/server.js`. La question du médecin répond 200, avec `La recherche par le sens est momentanément indisponible` et des sources. Trois essais par appel : compter quelques secondes.

## Gotchas

- `/search?q=…` sans `place` reste la recherche par question (Albert) ; `/search?place=&q=…` est la recherche par mot-clé dans toute la France. Ne pas conclure à une régression en comparant les deux.
- Un mot-clé se cherche tel qu'écrit : « retraite » ne trouve pas « retraites ». C'est voulu, pour que le nombre suggéré soit celui de la liste.

- Sans embeddings en base, la recherche vectorielle ne renvoie rien et seule la branche plein texte compte : lancer `scripts/embed.ts` après une ingestion sans `ALBERT_API_KEY`.
- La réponse est générée : son texte change d'un appel à l'autre. Vérifier la structure (renvois valides, sources pertinentes), pas une phrase exacte.
- `.env.local` est lu par `next dev` **et** `next build` : le standalone n'en hérite pas, il faut lui passer les variables.
