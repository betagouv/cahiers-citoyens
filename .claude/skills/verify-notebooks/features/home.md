# Accueil

La page d'accueil (`/`, `src/app/page.tsx`) suit la maquette DSFR : un bandeau de recherche (lieu et mot-clé), une section « Ce qui est en ligne » avec la carte des départements et la liste des zones publiées, puis trois tuiles « Pour bien lire les cahiers ». La page est statique : elle ne lit pas la base ; les suggestions du formulaire passent par les routes `/api/suggestions/*` et `/api/pages/count`. Le registre des zones publiées vit dans `src/lib/departments.ts`, le style de la carte dans `src/lib/department-map-style.ts`, la carte elle-même dans `src/app/_components/department-map.tsx`.

## Sub-features

- `home-hero` : titre `Rechercher des cahiers citoyens`, paragraphe de présentation, fond beige (`--background-contrast-brown-caramel`).
- `home-search` : formulaire GET vers `/search` (`src/app/_components/home-search-form.tsx`, champs dans `place-keyword/`) avec les comboboxes `Lieu` et `Mot-clé` et le bouton `Rechercher`. Sans JavaScript, le texte du lieu part dans `place`, le mot-clé dans `q`. Avec : dès 2 caractères et 150 ms sans frappe, une liste de 8 suggestions au plus s'ouvre sous le champ (préfixe en gras, nombre de pages en gras ou `À venir`), puis un encadré beige `Votre commune n’apparaît pas ?` / `Vous ne trouvez pas votre mot ?` avec son lien. Le lieu choisi s'affiche `Charolles (71)` et part par son code dans un champ caché `place`. Le bouton devient `Voir les 286 pages` (pages du lieu), y compris pendant qu'on tape un début de mot (`retr`) ; il ne compte le mot-clé (`/api/pages/count`, `Voir les pages` avec une roue pendant le compte, puis `Voir les 7 pages` ou `Voir la page`) qu'une fois celui-ci choisi dans la liste ou tapé exactement comme une suggestion. Il reste `Rechercher` sans lieu ni mot entier, à 0 page (`À venir`) ou si le compte échoue. Bouton `Effacer le lieu` / `Effacer le mot-clé` dans chaque champ rempli. Détails : [`docs/search-by-place-and-keyword.md`](../../../../docs/search-by-place-and-keyword.md).
- `home-online-text` : titre `Ce qui est en ligne`, paragraphe dont le nombre de départements (7) se calcule depuis `PUBLISHED_AREAS` (métropole seulement).
- `home-online-tags` : sous `Lire les cahiers d'un département`, une étiquette par zone publiée, dans l'ordre du registre ; chacune mène à `areaHref(zone)`, aujourd'hui `/search?place=<codes séparés par des virgules>` (`Outre-mer` : `971,972,973,974,976`). Puis le lien `Voir l'état de publication de tous les départements` vers `/publication`.
- `home-map` : carte MapLibre des départements (métropole et cinq encarts d'outre-mer à gauche), colorée par statut : en ligne (caramel), à venir (beige clair), sans cahier (gris, liste vide pour l'instant). Survol : le département fonce et une infobulle affiche `Doubs (25) · Cahiers en ligne`. Clic sur un département en ligne : navigation vers `areaHref` de sa zone. Pas de déplacement ni de zoom. Couleurs tirées du DSFR, recalculées au changement de thème.
- `home-map-legend` : trois pastilles `Cahiers en ligne`, `Cahiers à venir`, `Pas de cahier dans le fonds numérisé`, aux mêmes couleurs que la carte, puis la mention `Limites administratives : © DINUM (data.gouv.fr)`.
- `home-tiles` : section bleue `Pour bien lire les cahiers`, trois tuiles horizontales avec pictogramme vers `/understanding`, `/publication`, `/faq`.

## How to get to it (user POV)

- Ouvrir `/`, cliquer `Accueil` dans la navigation, ou le nom du service dans l'en-tête.

## Driving it with agent-browser

Préconditions : serveur lancé, accès réseau à `openmaptiles.geo.data.gouv.fr` et `openmaptiles.data.gouv.fr` pour les tuiles de la carte. Aucune base nécessaire.

- **Ouverture.** `agent-browser open "$NOTEBOOKS_BASE_URL/"`, `wait --load networkidle`, `wait 2500`, `snapshot`. Le titre de niveau 1 est `Rechercher des cahiers citoyens` ; le `search` contient les zones `Lieu` et `Mot-clé` et le bouton `Rechercher`.
- **Recherche.** Préconditions : base migrée (`0003`, `0004`), référentiel chargé (`geo:load`), quelques pages fictives publiées puis `select refresh_search_counts()`. `click` puis `type` sur le combobox `Lieu` (`Char`), `wait 800`, `snapshot` : `combobox … [expanded=true]` puis un `listbox "Lieu"` d'options `Charente (16) Département … pages` et `Charolles Commune · Saône-et-Loire (71) …`. `press ArrowDown` (×n), `press Enter` : le champ vaut `Charolles (71)`, le bouton `Voir les <n> pages`, et `agent-browser eval 'document.querySelector("input[type=hidden][name=place]").value'` renvoie `71106`. Même chose sur `Mot-clé` (`retr`) : options `retraite <n> page(s)`. Clic sur le bouton : l'URL devient `/search?place=71106&q=retraite`. Sans base, les routes répondent 500 et les listes restent fermées : le formulaire reste utilisable.
- **Annonce.** La zone `status` de chaque champ (masquée) vaut `8 suggestions. Flèches haut et bas pour les parcourir.` : `agent-browser eval 'document.querySelector("#place-keyword-place").closest(".fr-input-group").querySelector("[role=status]").textContent'`.
- **Étiquettes.** Le `snapshot` liste les liens `Alpes-de-Haute-Provence`, `Creuse`, `Doubs`, `Gironde`, `Manche`, `Outre-mer`, `Seine-Saint-Denis`, `Somme`. Clic sur `Doubs` : `/search?place=25`.
- **Carte colorée.** Elle n'apparaît pas dans le `snapshot` (canvas sous `aria-hidden`) : la contrôler sur une capture. `agent-browser eval 'document.querySelectorAll(".maplibregl-canvas").length'` renvoie `6`.
- **Survol et clic.** À 1280 px de large, après `scroll down 500`, le Doubs est vers `(485, 355)` : `agent-browser mouse move 485 355`, `wait 600`, capture : le Doubs fonce et l'infobulle `Doubs (25) · Cahiers en ligne` apparaît. `mouse down` puis `mouse up` : l'URL devient `/search?place=25`. Un clic sur un département à venir ne navigue pas.
- **Thème.** Clic sur `Paramètres d'affichage`, puis `find label "Thème sombre" click` : la page et la carte passent en sombre sans rechargement.
- **Preuve.** `notebooks-verify shot home-desktop`, puis `NOTEBOOKS_SHOT_WIDTH=375 notebooks-verify shot home-mobile`. Sur mobile, l'ordre est texte, carte et légende, puis étiquettes.

## Gotchas

- Les nombres viennent des vues matérialisées `word_page_counts` et `place_page_counts` : sans `select refresh_search_counts()` après le chargement de pages, tout reste à `À venir` et le bouton à `Rechercher`. Comparer un nombre affiché à `select page_count from place_page_counts where place = '71106'`.
- Un `type` trop rapide puis une capture immédiate montre l'ancienne liste : attendre 150 ms de pause plus la réponse (`wait 800`).

- La carte est un canvas souris seulement, enveloppé dans `aria-hidden="true"`, canvas hors de l'ordre de tabulation (`tabindex="-1"`). Clavier et lecteurs d'écran passent par les étiquettes, qui mènent aux mêmes pages.
- Les tuiles viennent de `openmaptiles.geo.data.gouv.fr` (TileJSON, source reprise de la surcouche `administrativeBoundaries` de Carte facile) puis de `openmaptiles.data.gouv.fr`. Sans réseau, les cadres restent vides sans casser la page.
- MapLibre 6 cherche son worker à côté de son module, introuvable une fois regroupé par Turbopack : `setWorkerUrl` reçoit l'URL du fichier publié dans `.next/static/media/`. Symptôme si ça casse : `Worker failed to load` dans la console et cadres vides.
- MapLibre et Carte facile sont importés dans un `useEffect` : ils ne s'évaluent jamais côté serveur.
- En dev, après de nombreux rechargements à chaud, les cadres peuvent rester vides (style jamais chargé) alors que le code est bon. Fermer la session (`agent-browser close`) et rouvrir la page avant de conclure. Constaté le 2026-11-25.
- `ABSENT_DEPARTMENT_CODES` est vide tant que la liste n'est pas fournie : aucun département n'est gris.
