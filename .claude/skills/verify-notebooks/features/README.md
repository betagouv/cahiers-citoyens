# Carte de vérification Cahiers citoyens

Ce dossier est la source maintenue pour vérifier le comportement visible de Cahiers citoyens. Lis cet index avant de piloter l'app, puis prends la fiche de la feature concernée comme recette.

## Le domaine en quelques phrases

Pendant l'hiver 2018-2019, en réponse au mouvement des Gilets jaunes, des mairies ont ouvert des **cahiers de doléances** (ou cahiers citoyens) où les habitants ont écrit des **contributions**. Chaque cahier est numérisé (scan PDF) et transcrit ; chaque contribution devient un **passage** (chunk) indexé pour la recherche, en plein texte et par vecteur.

Aujourd'hui : accueil, liste des cahiers, visionneuse, recherche. Pas de compte. Les cahiers chargés sont fictifs et l'accueil le dit.

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

- [Gabarit DSFR](./dsfr-layout.md) — en-tête, pied de page, liens d'évitement, titre de page, communs à toutes les pages.
- [Cahiers : liste et visionneuse](./notebooks.md) — tableau paginé, scan PDF et transcription côte à côte, 404.
- [Recherche](./search.md) — question en langage courant, réponse sourcée, replis quand Albert est indisponible.
- [Accueil](./home.md) — présentation, barre de recherche, chiffres du corpus tirés de la base, lien vers la liste.

## État de vérification

**Vérifié en `--prod` le 2026-11-11, base de 30 faux cahiers vectorisés :** `home-intro`, `home-search` (saisie puis Entrée depuis l'accueil), `home-figures` (confrontés à la base), `home-notice`, `home-browse`, `layout-nav` (rubrique active sur `/notebooks`, `/notebooks/<id>`, `/search`, aucune sur la 404), `notebooks-list`, `notebook-viewer`, `notebook-scan`, `notebook-not-found` (404 aussi en dev), `search-answer`, `search-sources`, `search-degraded` (standalone lancé avec `ALBERT_BASE_URL=http://127.0.0.1:9`). Preuves dans `../evidence/`.

**Vérifié de bout en bout le 2026-11-06, en dev et en `--prod` :** `layout-header`, `layout-footer`.

**Dérivé du code sans exécution :** le comportement de `layout-skip-links` au clavier (liens présents dans le `snapshot`, navigation par Tab non exercée).
