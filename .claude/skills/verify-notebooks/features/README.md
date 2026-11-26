# Carte de vérification Cahiers citoyens

Ce dossier est la source maintenue pour vérifier le comportement visible de Cahiers citoyens. Lis cet index avant de piloter l'app, puis prends la fiche de la feature concernée comme recette.

## Le domaine en quelques phrases

Pendant l'hiver 2018-2019, en réponse au mouvement des Gilets jaunes, des mairies ont ouvert des **cahiers de doléances** (ou cahiers citoyens) où les habitants ont écrit des **contributions**. Chaque cahier est livré par Condorcet page par page : une image et sa transcription ligne à ligne ; chaque contribution devient un **passage** (chunk) indexé pour la recherche, en plein texte et par vecteur.

Aujourd'hui : accueil (recherche par lieu et mot-clé, carte des départements publiés), liste des cahiers, page d'un cahier (images et transcriptions), recherche, et des pages provisoires au texte fictif (`/understanding`, `/publication`, `/faq`, `/accessibility`, `/legal-notice`, `/personal-data`) plus le plan du site (`/site-map`). Pas de compte. Les cahiers chargés sont fictifs.

## Préconditions de base

- `eval "$(.claude/skills/verify-notebooks/scripts/notebooks-verify env)"`, puis `notebooks-verify launch` (ou `launch --prod` pour le build standalone).
- Passer `notebooks-verify doctor`.
- Ne jamais piloter une instance que ce run n'a pas démarrée ou explicitement reconnue.

## Conventions de pilotage

- Préférer les rôles ARIA et les noms accessibles (`snapshot`) aux sélecteurs CSS.
- Attendre `wait --load networkidle` puis ≈ 2,5 s après chaque navigation : le contenu sous Suspense arrive en flux.
- Re-`snapshot` après chaque changement de page : les `@refs` deviennent obsolètes.
- Lire les titres dans le `snapshot`, jamais par `querySelector("h1")`.

## Preuves et signalement des impasses

- Une preuve UI comprend un `snapshot` et une capture : `notebooks-verify shot <nom>` produit les deux.
- Consigner l'identifiant de la feature et le point d'entrée utilisé avec chaque artefact (le `<nom>` de `shot`).
- Rapporter un chemin inatteignable avec la commande tentée et la précondition non remplie ; ne jamais présenter comme vérifié un point d'entrée contourné par un autre chemin.

## Contrat d'une fiche

Un titre H1, un paragraphe de comportement visible, puis exactement quatre H2 : `Sub-features`, `How to get to it (user POV)`, `Driving it with agent-browser`, `Gotchas`.

## Features

- [Gabarit DSFR](./dsfr-layout.md) — en-tête, navigation, paramètres d'affichage, pied de page, liens d'évitement, titre de page, communs à toutes les pages.
- [Cahiers : liste et page d'un cahier](./notebooks.md) — tableau paginé, pages en image à côté de leur transcription, route des images, retrait, 404.
- [Recherche](./search.md) — pages d'un lieu et d'un mot-clé (liste paginée, extraits surlignés) ; question en langage courant, réponse sourcée, replis quand Albert est indisponible.
- [Accueil](./home.md) — recherche par lieu et mot-clé avec suggestions et nombre de pages, carte MapLibre des départements publiés, étiquettes par zone, tuiles de lecture.

## État de vérification

**Vérifié en `--prod` le 2026-11-26, Postgres 16 sans pgvector, base migrée jusqu'à `0008` et chargée par l'ancien chargeur, puis `0009` et `db:seed --if-empty` (anciens codes renommés, second passage sans rechargement), 3 faux cahiers dont un passé en Béon `01039` :** `home-search` (ancienne commune `Béon` avant `Béon (89)` `À venir`, nom accessible avec `Ancienne commune`, champ `Béon (01)`, champ caché `01039`, bouton `Voir les 6 pages`), `search-pages-former` (titre d'onglet et `h2` `… Béon (ancienne commune, aujourd’hui Culoz-Béon)`, 6 pages comme en base), `search-pages-nojs` (`?place=beon`, `Béon (01)`, `Béon (89)`), `/search?place=01138` (6 pages). Non exercé : lecteur d'écran réel.

**Vérifié en `--prod` le 2026-11-26, Postgres 16 sans pgvector, 3 faux cahiers de `deliver.ts` publiés par `ingest-local.ts` :** `notebook-keyword-highlight` (clic depuis `/search?place=&q=retraite`, section ancrée à 0 px, décalage de mise en page nul à 1280 et 375 px, marques identiques à `ts_headline` sur les 30 pages trouvées pour 8 mots-clés, lien `Aller à la première occurrence`, page inchangée sans `?q=`), `notebook-keyword-lines` (calque sur les pages trouvées, aligné sur l'image à 1280 et 700 px), en clair et en sombre ; `search-pages` (liens `?q=<mot>#page-<n>`). Non exercé : lecteur d'écran réel.

**Vérifié en `--prod` le 2026-11-26, Postgres 16 sans pgvector, référentiel réel, 0 puis 3 faux cahiers publiés (02, 2A et un passé en 974) :** `home-online-text` (état vide, puis `3 cahiers … dans 2 départements et les outre-mer`), `home-online-tags` (`Aisne`, `Corse-du-Sud`, `Outre-mer`, aucune liste à vide), `home-map` (seuls 02, 2A et 974 en caramel, infobulles `· 1 cahier en ligne` et `· Cahiers à venir`, clics vers `/search?place=02` et `/search?place=974`, thème sombre), `home-map-legend` (deux statuts), captures 1280 et 375 px.

**Vérifié le 2026-11-25 en `--prod`, base locale (référentiel réel, 40 000 pages fictives) :** `home-search` (suggestions de lieux et de mots, clavier, souris, annonce, champ caché `place`, bouton `Voir les <n> pages` / `Voir la page`), `search-pages`, `search-pages-place` (pagination, 375 px), `search-pages-nojs` (`curl`), en-têtes `Cache-Control` des routes `/api/suggestions/*` et `/api/pages/count`. Non exercé : lecteur d'écran réel.

**Vérifié le 2026-11-25, en dev et en `--prod`, sans base :** `home-hero`, `home-search`, `home-tiles`, captures 1280 px et 375 px ; `layout-nav` (rubrique active sur `/`, `/understanding`, `/publication`, `/faq`, aucune sur `/search`, `/notebooks` et la 404), `layout-display`, menu mobile.

**Vérifié en `--prod` le 2026-11-11, base de 30 faux cahiers vectorisés :** `notebooks-list`, `notebook-viewer`, `notebook-scan`, `notebook-not-found` (404 aussi en dev), `search-answer`, `search-sources`, `search-degraded` (standalone lancé avec `ALBERT_BASE_URL=http://127.0.0.1:9`). Preuves dans `../evidence/`.

**Vérifié en `--prod` le 2026-11-26, Postgres 16 sans pgvector, 2 faux cahiers de `deliver.ts` publiés par `ingest-local.ts`, `LOCAL_BUCKET_DIR` absolu :** `notebooks-list`, `notebook-viewer` (1280 et 375 px), `notebook-anchors`, `notebook-lazy-images` (pages 1 et 2 seules chargées à l'ouverture), `notebook-page-image` (200, 404 sans `v` ou avec une autre version), `search-pages` (liens `#page-<n>`), puis après `withdraw` : page et images en 404, cahier absent de la liste et de la recherche par mot-clé. `search-sources` non exercé : pas de clé Albert.

**Vérifié de bout en bout le 2026-11-06, en dev et en `--prod` :** `layout-header`, `layout-footer`.

**Dérivé du code sans exécution :** le comportement de `layout-skip-links` au clavier (liens présents dans le `snapshot`, navigation par Tab non exercée).
