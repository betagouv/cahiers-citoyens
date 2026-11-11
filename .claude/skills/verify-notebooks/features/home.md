# Accueil

La page d'accueil (`/`, `src/app/page.tsx`) présente le projet, propose la barre de recherche, signale que les cahiers sont fictifs, affiche quatre chiffres tirés de la base et renvoie vers la liste des cahiers. Les chiffres viennent de `getCorpusStats` (`src/lib/notebooks.ts`) et arrivent en flux sous une frontière Suspense : la page affiche d'abord `Chargement des chiffres…`.

## Sub-features

- `home-intro` : titre `Cahiers citoyens` et paragraphe de présentation.
- `home-search` : barre de recherche DSFR (formulaire GET vers `/search?q=…`), qui marche sans JavaScript.
- `home-notice` : encart `Cahiers fictifs`.
- `home-figures` : sous `Le corpus en chiffres`, le nombre de cahiers, le nombre de contributions (chunks), la période d'ouverture (du mois du premier `opened_on` au mois du dernier) et la part des contributions indexées pour la recherche (chunks avec embedding, arrondie à l'inférieur). Base vide : `Aucun cahier n'a encore été chargé.`
- `home-browse` : bouton `Parcourir les cahiers` vers `/notebooks`.

## How to get to it (user POV)

- Ouvrir `/`, ou cliquer le nom du service `Cahiers citoyens` dans l'en-tête.

## Driving it with agent-browser

Préconditions : une base migrée et chargée (`scripts/load.ts`, puis `scripts/embed.ts` pour la part indexée), `DATABASE_URL` dans `.env.local` (ou exporté pour `--prod`).

- **Ouverture.** `agent-browser open "$NOTEBOOKS_BASE_URL/"`, `wait --load networkidle`, `wait 2500`, `snapshot`. Le titre de niveau 1 est `Cahiers citoyens`, le `search` contient la zone `Rechercher dans les cahiers` et le bouton `Rechercher`.
- **Chiffres.** Le `snapshot` contient le titre `Le corpus en chiffres` puis quatre paires valeur / libellé. Les confronter à la base :
  `select count(*), min(opened_on), max(opened_on) from notebooks; select count(*), count(embedding) from chunks;`
  Avec les 30 faux cahiers (`generate.ts --count 30 --seed 42`) chargés et vectorisés : `30` / `cahiers numérisés`, `258` / `contributions transcrites`, `décembre 2018 – février 2019` / `période d'ouverture des cahiers`, `100 %` / `des contributions indexées pour la recherche`.
- **Recherche depuis l'accueil.** `agent-browser fill <ref de la zone> "Il n'y a plus de médecin au village"`, `press Enter`, `wait --load networkidle`, `wait 2500` : l'URL devient `/search?q=Il+n%27y+a+plus+de+m%C3%A9decin+au+village` et la page affiche la réponse (voir `search.md`).
- **Lien vers la liste.** Clic sur `Parcourir les cahiers` : l'URL devient `/notebooks`.
- **Preuve.** `notebooks-verify shot home`.

## Gotchas

- Un `curl` de `/` ne voit pas toujours les chiffres : ils arrivent en flux après l'enveloppe statique. Les lire dans le navigateur.
- La part indexée vaut `0 %` tant que `scripts/embed.ts` n'a pas tourné après un `scripts/load.ts`, qui remplace les chunks.
- La barre de recherche est un vrai formulaire (`src/app/_components/search-form.tsx`), pas le `SearchBar` de react-dsfr, qui navigue en JavaScript.
