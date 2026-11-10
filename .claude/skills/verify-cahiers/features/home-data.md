# Accueil : données

La page d'accueil (`/`, `src/app/page.tsx`) présente le projet puis préfigure la consultation des témoignages : un encart signale que les données sont fictives, trois chiffres clés, une carte de France par région, trois graphiques sur les revendications et les dépôts, un tableau par région et un encart pour les mairies. Toutes les valeurs viennent de `src/app/_home/sample-data.ts`.

## Sub-features

- `home-notice` affiche l'encart `Données d'illustration` sous le titre.
- `home-figures` affiche le total des témoignages, des communes participantes et le nombre de régions.
- `home-map` colore les 18 régions (13 de métropole, 5 d'outre-mer) selon le nombre de témoignages.
- `home-charts` affiche les barres `Revendications les plus citées`, la courbe `Dépôts de témoignages par semaine` et le camembert `Communes participantes par taille`.
- `home-table` liste les 18 régions triées par nombre de témoignages décroissant.
- `home-town-halls` affiche l'encart `Vous êtes une mairie ?`, sans lien.

## How to get to it (user POV)

- Ouvrir `/`, ou cliquer le nom du service `Cahiers citoyens` dans l'en-tête.

## Driving it with agent-browser

Préconditions : serveur lancé, aucune donnée à préparer.

- **Ouverture.** `agent-browser open "$CAHIERS_BASE_URL/"`, `wait --load networkidle`, `wait 2500`, `snapshot`. Le titre de niveau 1 est `Cahier en construction`, précédé du badge `EN CONSTRUCTION`.
- **Avertissement.** Le `snapshot` contient `Données d'illustration` puis `Tous les chiffres de cette page sont fictifs.`
- **Chiffres clés.** Le `snapshot` contient `185 610` / `témoignages recensés`, `14 594` / `communes participantes`, `18` / `régions, dont 5 d'outre-mer`. Les deux totaux sont les sommes des champs `testimonies` et `participatingMunicipalities` de `regions` dans `sample-data.ts` : les recalculer après toute modification des données.
- **Carte et graphiques.** `cahiers-verify charts` renvoie quatre entrées, toutes `ok: true` : `map-chart` avec `zones: 18`, puis `bar-chart`, `line-chart` et `pie-chart` dont `rendered` égale `container`. Les titres de niveau 2 `Témoignages par région`, `Revendications les plus citées`, `Dépôts de témoignages par semaine`, `Communes participantes par taille` sont dans le `snapshot`.
- **Redimensionnement.** `agent-browser set viewport 900 800`, `wait 1500`, puis `charts` : toujours `ok: true` (les encarts passent sur une colonne). Revenir avec `set viewport 1280 800`.
- **Tableau.** Le `snapshot` contient le tableau de légende `Témoignages et communes participantes par région`, 4 colonnes, 18 lignes, `Île-de-France` / `24 510` en tête et `Mayotte` / `190` en dernier.
- **Preuve.** `cahiers-verify shot home` : la capture doit montrer la carte coloriée et les trois graphiques à pleine taille.

## Gotchas

- Les graphiques n'existent qu'après hydratation : avant, chaque encart montre un bloc gris `role="status"` (« Chargement : … »). Un `curl` de la page ne voit que ces blocs.
- La carte n'occupe pas toute la largeur de son encart : un panneau de légende est à sa gauche. C'est le comportement de `map-chart`, d'où le comptage de zones plutôt qu'une mesure de largeur.
- Le camembert est le plus sensible au bug de dimensionnement de dsfr-chart (il se reconstruit hors de la page à chaque redimensionnement). Le tester après tout changement de `dsfr-chart.tsx` ou de version de `@gouvfr/dsfr-chart`.
- `pie-chart` attend `x` et `y` en listes imbriquées (`[[…]]`), comme les autres graphiques, malgré l'exemple du README de dsfr-chart. En liste simple, il ne dessine rien.
