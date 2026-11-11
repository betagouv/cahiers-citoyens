# Gabarit DSFR

Chaque page porte le gabarit de l'État : liens d'évitement, en-tête avec le bloc-marque « République Française », le nom du service « Cahiers citoyens » et la navigation principale, contenu dans `<main id="content">`, pied de page DSFR. Le gabarit vit dans `src/app/layout.tsx`, l'intégration DSFR dans `src/dsfr-bootstrap/`.

## Sub-features

- `layout-header` affiche le bloc-marque et le nom du service, qui ramène à `/`.
- `layout-nav` : navigation principale DSFR avec `Rechercher` (`/search`) et `Cahiers` (`/notebooks`). Le lien de la rubrique courante porte `aria-current="page"` : `Cahiers` sur `/notebooks` et `/notebooks/<id>`, `Rechercher` sur `/search`, aucun sur `/` ni sur la page 404 (`src/app/_components/header-navigation.tsx`).
- `layout-footer` affiche le pied de page DSFR avec les liens institutionnels, la mention d'accessibilité et la licence.
- `layout-skip-links` propose « Accéder au contenu » et « Accéder au pied de page ».
- `layout-title` donne à l'onglet le titre `Cahiers citoyens`.

## How to get to it (user POV)

- Ouvrir n'importe quelle page : `/`, `/search`, `/notebooks`, `/notebooks/<id>`.
- Les liens d'évitement apparaissent à la première tabulation.

## Driving it with agent-browser

Préconditions : serveur lancé, aucune.

- **En-tête.** `agent-browser open "$NOTEBOOKS_BASE_URL/"`, `wait --load networkidle`, `snapshot`. Le `banner` contient `RÉPUBLIQUE` / `FRANÇAISE` et le lien `Cahiers citoyens`.
- **Navigation.** Dans le `snapshot` de `/notebooks`, la `navigation "Menu principal"` contient les liens `Rechercher` et `Cahiers`. `agent-browser eval 'document.querySelector("#fr-header-main-navigation [aria-current=page]")?.textContent'` renvoie `"Cahiers"` ; sur `/search`, `"Rechercher"` ; sur `/`, `null`. Sous 992 px de large, les liens passent dans le menu ouvert par le bouton `Menu`.
- **Pied de page.** Dans le `snapshot`, le `contentinfo` contient les liens `info.gouv.fr`, `service-public.gouv.fr`, `legifrance.gouv.fr`, `data.gouv.fr`, le texte `Accessibilité : non conforme` et le lien `licence etalab-2.0`.
- **Évitement.** La `navigation "Accès rapide"` contient `Accéder au contenu` et `Accéder au pied de page`. Leurs cibles existent : `agent-browser eval 'Boolean(document.getElementById("content") && document.getElementById("footer"))'` renvoie `true`.
- **Titre.** `agent-browser get title` renvoie `Cahiers citoyens`.
- **Preuve.** `notebooks-verify shot layout`.

## Gotchas

- `Accessibilité : non conforme` est voulu : aucun audit RGAA n'a été fait. Le passer à `partially compliant` ou `fully compliant` demande un audit, pas un changement de code.
- La modale « Paramètres d'affichage » du DSFR est dans le DOM avec un `h1` caché : elle ne compte pas comme titre de page.
- Le thème est forcé en clair (`src/dsfr-bootstrap/defaultColorScheme.ts`) : un `set media dark` ne change rien, c'est attendu.
