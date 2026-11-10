# Carte de vérification Cahiers citoyens

Ce dossier est la source maintenue pour vérifier le comportement visible de Cahiers citoyens. Lis cet index avant de piloter l'app, puis prends la fiche de la feature concernée comme recette.

## Le domaine en quelques phrases

Pendant l'hiver 2018-2019, en réponse au mouvement des Gilets jaunes, des mairies ont ouvert des **cahiers de doléances** (ou cahiers citoyens) où les habitants ont déposé des **témoignages**. Chaque témoignage est rattaché à une **commune**, donc à un département et à une **région**, et exprime une ou plusieurs **revendications** (pouvoir d'achat, fiscalité, services publics, démocratie et RIC, transition écologique…). L'application les recense et les rend consultables par territoire et par revendication.

Aujourd'hui : une page d'accueil publique, sans compte ni base. Ses chiffres sont fictifs (`src/app/_home/sample-data.ts`) et la page le dit.

## Préconditions de base

- `eval "$(.claude/skills/verify-notebooks/scripts/notebooks-verify env)"`, puis `notebooks-verify launch` (ou `launch --prod` pour le build standalone).
- Passer `notebooks-verify doctor`.
- Ne jamais piloter une instance que ce run n'a pas démarrée ou explicitement reconnue.

## Conventions de pilotage

- Préférer les rôles ARIA et les noms accessibles (`snapshot`) aux sélecteurs CSS ; les web components dsfr-chart (`bar-chart`, `line-chart`, `pie-chart`, `map-chart`) sont l'exception, ils n'exposent pas de rôle utile.
- Attendre `wait --load networkidle` puis ≈ 2,5 s après chaque navigation : dsfr-chart se charge après l'hydratation.
- Re-`snapshot` après chaque changement de page : les `@refs` deviennent obsolètes.
- Lire les titres dans le `snapshot`, jamais par `querySelector("h1")`.

## Preuves et signalement des impasses

- Une preuve UI comprend un `snapshot` et une capture : `notebooks-verify shot <nom>` produit les deux.
- Un graphique se prouve par `notebooks-verify charts` **et** par la capture.
- Consigner l'identifiant de la feature et le point d'entrée utilisé avec chaque artefact (le `<nom>` de `shot`).
- Rapporter un chemin inatteignable avec la commande tentée et la précondition non remplie ; ne jamais présenter comme vérifié un point d'entrée contourné par un autre chemin.

## Contrat d'une fiche

Un titre H1, un paragraphe de comportement visible, puis exactement quatre H2 : `Sub-features`, `How to get to it (user POV)`, `Driving it with agent-browser`, `Gotchas`.

## Features

- [Gabarit DSFR](./dsfr-layout.md) — en-tête, pied de page, liens d'évitement, titre de page, communs à toutes les pages.
- [Cahiers : liste et visionneuse](./notebooks.md) — tableau paginé, scan PDF et transcription côte à côte, 404.
- [Recherche](./search.md) — question en langage courant, réponse sourcée, replis quand Albert est indisponible.
- [Accueil : données](./home-data.md) — chiffres clés, carte par région, trois graphiques, tableau par région, encart mairies.

## État de vérification

**Revérifié en dev le 2026-11-10, après le passage du code en anglais :** `home-figures`, `home-map`, `home-charts` (mesure `charts` et capture), `home-table`.

**Vérifié de bout en bout le 2026-11-06, en dev et en `--prod` :** `home-figures`, `home-map`, `home-charts` (mesure `charts` et capture), `home-table`, `layout-header`, `layout-footer`. Preuves dans `../evidence/`.

**Dérivé du code sans exécution :** le comportement de `layout-skip-links` au clavier (liens présents dans le `snapshot`, navigation par Tab non exercée).
