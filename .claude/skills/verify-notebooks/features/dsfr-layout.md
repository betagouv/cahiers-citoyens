# Gabarit DSFR

Chaque page porte le gabarit de l'État : liens d'évitement, en-tête avec le bloc-marque « République Française », le nom du service « Cahiers citoyens », sa description « Consulter les cahiers du Grand Débat national », l'accès rapide « Paramètres d'affichage » et la navigation principale, contenu dans `<main id="content">`, pied de page DSFR. Le gabarit vit dans `src/app/layout.tsx`, l'intégration DSFR dans `src/dsfr-bootstrap/`.

## Sub-features

- `layout-header` affiche le bloc-marque, le nom du service, qui ramène à `/`, et sa description.
- `layout-display` : le bouton `Paramètres d'affichage` (en-tête et pied de page) ouvre la modale de thème DSFR ; clair, sombre ou système s'appliquent sans rechargement. Il faut `<StartDsfrOnHydration />` dans `src/app/layout.tsx` pour que le JavaScript du DSFR démarre.
- `layout-nav` : navigation principale DSFR avec `Accueil` (`/`), `Comprendre les cahiers` (`/understanding`), `Publication des cahiers` (`/publication`) et `Questions fréquentes` (`/faq`). Les trois dernières pages sont provisoires : un titre, l'encart `Page provisoire` et quelques sections au texte fictif (`src/app/_components/placeholder-page.tsx`). Le lien de la rubrique courante porte `aria-current="page"` : `Accueil` sur `/`, la rubrique sur sa page, aucun sur `/search`, `/notebooks` (toujours en ligne, hors navigation) ni sur la page 404 (`src/app/_components/header-navigation.tsx`).
- `layout-footer` affiche le pied de page DSFR : description du site (DITP, DINUM, Campus Condorcet), liens institutionnels, puis, dans l'ordre de la maquette, `Accessibilité : non conforme` (`/accessibility`), `Mentions légales` (`/legal-notice`), `Données personnelles` (`/personal-data`), `Plan du site` (`/site-map`), `Paramètres d'affichage`, et la licence. Ces pages sont provisoires, comme celles de la navigation, sauf le plan du site, qui liste les vraies pages.
- `layout-skip-links` propose « Accéder au contenu » et « Accéder au pied de page ».
- `layout-title` donne à l'onglet le titre `Cahiers citoyens`.

## How to get to it (user POV)

- Ouvrir n'importe quelle page : `/`, `/understanding`, `/publication`, `/faq`, `/accessibility`, `/legal-notice`, `/personal-data`, `/site-map`, `/search`, `/notebooks`, `/notebooks/<id>`.
- Les liens d'évitement apparaissent à la première tabulation.

## Driving it with agent-browser

Préconditions : serveur lancé, aucune.

- **En-tête.** `agent-browser open "$NOTEBOOKS_BASE_URL/"`, `wait --load networkidle`, `snapshot`. Le `banner` contient `RÉPUBLIQUE` / `FRANÇAISE`, le lien `Cahiers citoyens`, `Consulter les cahiers du Grand Débat national` et le bouton `Paramètres d'affichage`.
- **Thème.** `agent-browser find role button click --name "Paramètres d'affichage"`, `find label "Thème sombre" click` : `agent-browser eval 'document.documentElement.getAttribute("data-fr-theme")'` renvoie `"dark"`. Revenir avec `Thème clair`.
- **Navigation.** La `navigation "Menu principal"` contient `Accueil`, `Comprendre les cahiers`, `Publication des cahiers`, `Questions fréquentes`. `agent-browser eval 'document.querySelector("#fr-header-main-navigation [aria-current=page]")?.textContent'` renvoie `"Accueil"` sur `/`, `"Questions fréquentes"` sur `/faq`, `null` sur `/search`, `/notebooks` et une adresse inconnue. Sous 992 px de large, les liens passent dans le menu ouvert par le bouton `Menu` (classe `fr-modal--opened` sur `#header-menu-modal-fr-header`).
- **Pied de page.** Dans le `snapshot`, le `contentinfo` contient la description `Ce site donne accès aux cahiers citoyens…`, les liens `info.gouv.fr`, `service-public.gouv.fr`, `legifrance.gouv.fr`, `data.gouv.fr`, les liens `Accessibilité : non conforme`, `Mentions légales`, `Données personnelles`, `Plan du site`, le bouton `Paramètres d'affichage` et le lien `licence etalab-2.0`.
- **Évitement.** La `navigation "Accès rapide"` contient `Accéder au contenu` et `Accéder au pied de page`. Leurs cibles existent : `agent-browser eval 'Boolean(document.getElementById("content") && document.getElementById("footer"))'` renvoie `true`.
- **Titre.** `agent-browser get title` renvoie `Cahiers citoyens`.
- **Preuve.** `notebooks-verify shot layout`.

## Gotchas

- `Accessibilité : non conforme` est voulu : aucun audit RGAA n'a été fait. Le passer à `partially compliant` ou `fully compliant` demande un audit, pas un changement de code.
- La modale « Paramètres d'affichage » du DSFR est dans le DOM avec un `h1` caché : elle ne compte pas comme titre de page.
- Le thème par défaut est clair (`src/dsfr-bootstrap/defaultColorScheme.ts`) : un `set media dark` ne change rien, c'est attendu. Le choix fait dans la modale est gardé dans `localStorage` (`scheme`) : repartir d'une session neuve pour une capture en thème clair.
- Sans `<StartDsfrOnHydration />`, le DSFR ne démarre pas : les boutons `Paramètres d'affichage` et `Menu` ne font rien, sans erreur dans la console. Constaté et corrigé le 2026-11-25.
